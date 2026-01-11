const { PrismaClient } = require('@prisma/client');
const { sendInstagramDmWithPlaywright } = require('../src/lib/instagram-playwright');

const prisma = new PrismaClient();
const POLL_INTERVAL = 30000; // 30 seconds
const MAX_CONCURRENT = 3; // Max concurrent Playwright instances

// Worker state
let isRunning = false;
let activeJobs = new Map();

// Health check endpoint
const http = require('http');
const server = http.createServer(async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      isRunning,
      activeJobs: activeJobs.size,
      timestamp: new Date().toISOString()
    }));
  } else if (req.url === '/send-messages' && req.method === 'POST') {
    // Handle send-messages request from dashboard
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        
        // Queue messages for processing
        const { campaignId, instagramAccountId, maxToProcess = 50 } = data;
        
        // Get pending messages for this campaign
        const messages = await prisma.message.findMany({
          where: {
            campaignId,
            status: 'pending',
            scheduledAt: { lte: new Date() }
          },
          take: maxToProcess,
          orderBy: { scheduledAt: 'asc' }
        });

        // Update status to queued
        const messageIds = messages.map(m => m.id);
        if (messageIds.length > 0) {
          await prisma.message.updateMany({
            where: { id: { in: messageIds } },
            data: { status: 'queued' }
          });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          message: `Queued ${messageIds.length} messages for processing`,
          processed: messageIds.length,
          queued: messageIds.length
        }));
      } catch (error) {
        console.error('Error in /send-messages:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Start health check server
server.listen(8080, () => {
  console.log('Worker health check listening on port 8080');
});

async function processMessage(message) {
  const jobId = message.id;
  
  try {
    console.log(`Processing message ${jobId} to @${message.recipientUsername}`);
    
    // Update status to processing
    await prisma.message.update({
      where: { id: jobId },
      data: { status: 'processing' }
    });

    // Get campaign and account details
    const campaign = await prisma.campaign.findUnique({
      where: { id: message.campaignId },
      include: { accounts: true }
    });

    if (!campaign || campaign.accounts.length === 0) {
      throw new Error('No accounts found for campaign');
    }

    const account = campaign.accounts[0]; // Use first account for now

    // Send DM with Playwright
    const result = await sendInstagramDmWithPlaywright({
      recipientUsername: message.recipientUsername,
      messageText: message.content,
      account: {
        username: account.username,
        password: account.password,
        sessionCookie: account.sessionCookie
      },
      headless: true,
      debug: true
    });

    // Update message status based on result
    if (result.success) {
      await prisma.message.update({
        where: { id: jobId },
        data: {
          status: 'sent',
          sentAt: new Date(),
          error: null
        }
      });
      console.log(`✅ Message ${jobId} sent successfully`);
    } else {
      await prisma.message.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          error: result.error || 'Unknown error'
        }
      });
      console.log(`❌ Message ${jobId} failed:`, result.error);
    }

  } catch (error) {
    console.error(`Error processing message ${jobId}:`, error);
    
    // Update message status to failed
    await prisma.message.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        error: error.message
      }
    });
  } finally {
    activeJobs.delete(jobId);
  }
}

async function pollForMessages() {
  if (isRunning || activeJobs.size >= MAX_CONCURRENT) {
    return;
  }

  try {
    // Find queued messages (not pending, since dashboard queues them)
    const messages = await prisma.message.findMany({
      where: {
        status: 'queued',
        scheduledAt: { lte: new Date() }
      },
      take: MAX_CONCURRENT - activeJobs.size,
      orderBy: { scheduledAt: 'asc' }
    });

    if (messages.length > 0) {
      console.log(`Found ${messages.length} queued messages to process`);
      
      // Process messages in parallel
      messages.forEach(message => {
        activeJobs.set(message.id, true);
        processMessage(message); // Don't await here, let them run in parallel
      });
    }
  } catch (error) {
    console.error('Error polling for messages:', error);
  }
}

// Main worker loop
async function startWorker() {
  console.log('🚀 Starting Playwright worker...');
  isRunning = true;

  while (true) {
    await pollForMessages();
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down worker...');
  isRunning = false;
  
  // Wait for active jobs to finish (with timeout)
  const timeout = setTimeout(() => {
    console.log('Forcefully shutting down...');
    process.exit(1);
  }, 30000); // 30 seconds timeout

  while (activeJobs.size > 0) {
    console.log(`Waiting for ${activeJobs.size} active jobs to finish...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  clearTimeout(timeout);
  console.log('✅ All jobs finished. Shutting down gracefully.');
  process.exit(0);
});

// Start the worker
startWorker().catch(console.error);

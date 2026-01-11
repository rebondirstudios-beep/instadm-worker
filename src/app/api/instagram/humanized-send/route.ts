import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { ensureDbUser } from "@/lib/dbUser";
import { InstagramHumanizer } from "@/lib/instagram-humanizer";

// Global humanizer instance
const humanizer = new InstagramHumanizer({
  minDelay: 45000,        // 45 seconds minimum
  maxDelay: 300000,       // 5 minutes maximum
  typingDelay: 3000,       // 3 seconds typing
  readDelay: 15000,       // 15 seconds before marking read
  sessionRotation: true,
  messageVariation: true,
  warmupTime: 600000,     // 10 minutes warmup
  activeHours: { start: 9, end: 21 }, // 9 AM - 9 PM
});

export async function POST(request: NextRequest) {
  try {
    const clerkUser = await requireAuth();
    if (clerkUser instanceof NextResponse) return clerkUser;

    const dbUser = await ensureDbUser(clerkUser);
    const body = await request.json().catch(() => ({}));
    
    const { messageId, instagramAccountId } = body;
    
    if (!messageId || !instagramAccountId) {
      return NextResponse.json({ error: "messageId and instagramAccountId are required" }, { status: 400 });
    }

    // Get message and account from database
    const [message, account] = await Promise.all([
      prisma.message.findFirst({
        where: { id: messageId, campaign: { userId: dbUser.id } },
        include: { campaign: true },
      }),
      prisma.instagramAccount.findFirst({
        where: { id: instagramAccountId, userId: dbUser.id },
      }),
    ]);

    if (!message || !account) {
      return NextResponse.json({ error: "Message or account not found" }, { status: 404 });
    }

    if (!account.accessToken) {
      return NextResponse.json({ 
        error: "Instagram account not connected. Please connect your Instagram account first.",
        requiresAuth: true 
      }, { status: 400 });
    }

    try {
      // Apply humanization
      const humanized = await humanizer.humanizeSend(
        instagramAccountId,
        message.recipientUsername,
        message.content,
        message.threadId || undefined
      );

      // Wait for the optimal send time
      if (humanized.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, humanized.delay));
      }

      // Send via Instagram API (using existing send-single endpoint)
      const sendResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/instagram/send-single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          instagramAccountId,
        }),
      });

      const sendResult = await sendResponse.json();

      if (sendResult.success) {
        // Update message with humanized content and timing
        await prisma.message.update({
          where: { id: messageId },
          data: {
            content: humanized.variedMessage,
            status: "sent",
            sentAt: humanized.sendTime,
            threadId: sendResult.threadId,
            error: null,
            // Store humanization metadata
            metadata: {
              humanized: true,
              originalDelay: humanized.delay,
              sessionId: humanized.sessionId,
              messageVariation: humanized.variedMessage !== message.content,
            },
          },
        });

        // Simulate "mark as read" after delay
        if (Math.random() > 0.6) { // 60% chance to mark as read
          setTimeout(async () => {
            try {
              // This would use Instagram API to mark as read
              // For now, we'll just log it
              console.log(`Marked as read: ${message.recipientUsername} in thread ${sendResult.threadId}`);
            } catch (error) {
              console.error('Failed to mark as read:', error);
            }
          }, humanizer.config.readDelay);
        }

        return NextResponse.json({
          success: true,
          messageId,
          threadId: sendResult.threadId,
          recipient: message.recipientUsername,
          sentAt: humanized.sendTime.toISOString(),
          humanized: {
            delay: humanized.delay,
            variedMessage: humanized.variedMessage,
            sessionId: humanized.sessionId,
            messageVariation: humanized.variedMessage !== message.content,
          },
        });
      } else {
        // Update message status to failed
        await prisma.message.update({
          where: { id: messageId },
          data: {
            status: "failed",
            error: "Humanization delay failed",
            sentAt: new Date(),
          },
        });

        return NextResponse.json({
          success: false,
          error: "Failed to apply humanization",
          messageId,
        }, { status: 500 });
      }
    } catch (error) {
      console.error("Humanized send error:", error);
      
      // Update message status to failed
      await prisma.message.update({
        where: { id: messageId },
        data: {
          status: "failed",
          error: error instanceof Error ? error.message : "Humanization error",
          sentAt: new Date(),
        },
      });

      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        messageId,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Humanized send API error:", error);
    return NextResponse.json({ 
      error: error?.message || "Internal server error" 
    }, { status: 500 });
  }
}

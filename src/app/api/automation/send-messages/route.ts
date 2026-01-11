import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { ensureDbUser } from "@/lib/dbUser";
import { sendInstagramDmWithPlaywright } from "@/lib/instagram-playwright";
import { decryptSecretMaybe } from "@/lib/crypto";

export const runtime = "nodejs";

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomDelay(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isHardPlaywrightError(err: string) {
  const s = String(err || "");
  // Hard failures: login/verification/browser missing
  const hard = (
    s.includes("Instagram requires verification") ||
    s.includes("Login failed") ||
    s.includes("step=login_form") ||
    s.includes("Executable doesn't exist") ||
    s.includes("Playwright is not available") ||
    s.includes("Cannot find module 'playwright'") ||
    s.includes("browserType.launch")
  );
  // Soft failures: profile not available / private / no message button / compose missing
  const soft = (
    s.includes("step=profile_open") ||
    s.includes("step=message_button") ||
    s.includes("step=compose") ||
    s.includes("not available") ||
    s.includes("private account") ||
    s.includes("not approved")
  );
  return hard && !soft;
}

export async function POST(request: NextRequest) {
  try {
    const clerkUser = await requireAuth();
    if (clerkUser instanceof NextResponse) return clerkUser;

    const dbUser = await ensureDbUser(clerkUser);
    const body = await request.json().catch(() => ({}));
    
    const campaignId = body?.campaignId as string;
    const instagramAccountId = body?.instagramAccountId as string;
    const senderMode = String(body?.senderMode || process.env.INSTAGRAM_SENDER_MODE || "simulated");
    const headless = body?.headless === false ? false : process.env.IG_PLAYWRIGHT_HEADLESS === "false" ? false : true;
    const maxToProcessRaw = body?.maxToProcess;
    const maxToProcess =
      typeof maxToProcessRaw === "number"
        ? Math.max(1, Math.min(50, Math.floor(maxToProcessRaw)))
        : typeof maxToProcessRaw === "string"
          ? Math.max(1, Math.min(50, Math.floor(Number(maxToProcessRaw) || 50)))
          : 50;
    const skipDelay = Boolean(body?.skipDelay);
    const delayMinRaw = body?.delayMinMs;
    const delayMaxRaw = body?.delayMaxMs;
    const delayMinMs =
      typeof delayMinRaw === "number"
        ? Math.max(0, Math.floor(delayMinRaw))
        : typeof delayMinRaw === "string"
          ? Math.max(0, Math.floor(Number(delayMinRaw) || 30000))
          : 30000;
    const delayMaxMs =
      typeof delayMaxRaw === "number"
        ? Math.max(delayMinMs, Math.floor(delayMaxRaw))
        : typeof delayMaxRaw === "string"
          ? Math.max(delayMinMs, Math.floor(Number(delayMaxRaw) || 60000))
          : 60000;
    
    if (!campaignId || !instagramAccountId) {
      return NextResponse.json({ error: "campaignId and instagramAccountId are required" }, { status: 400 });
    }

    // Get campaign and account
    const [campaign, account] = await Promise.all([
      prisma.campaign.findFirst({
        where: { id: campaignId, userId: dbUser.id },
      }),
      prisma.instagramAccount.findFirst({
        where: { id: instagramAccountId, userId: dbUser.id },
      }),
    ]);

    if (!campaign || !account) {
      return NextResponse.json({ error: "Campaign or account not found" }, { status: 404 });
    }

    if (campaign.status === "completed") {
      return NextResponse.json({ error: "Campaign is completed" }, { status: 400 });
    }

    if (!account.isActive) {
      return NextResponse.json({ error: "Instagram account is not active" }, { status: 400 });
    }

    // Get message template
    const template = campaign.messageTemplateId
      ? await prisma.messageTemplate.findFirst({
          where: { id: campaign.messageTemplateId, userId: dbUser.id },
        })
      : null;

    const baseContent = template?.content || `Hi @{recipientUsername}!`;

    // Get pending messages for this campaign and account
    const pendingMessages = await prisma.message.findMany({
      where: {
        campaignId,
        instagramAccountId,
        status: "pending",
      },
      orderBy: { createdAt: "asc" },
      take: maxToProcess,
    });

    if (pendingMessages.length === 0) {
      return NextResponse.json({ message: "No pending messages to send", processed: 0 }, { status: 200 });
    }

    // Check daily limits
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    const [sentToday, usedToday] = await Promise.all([
      prisma.message.count({
        where: {
          instagramAccountId,
          status: "sent",
          sentAt: { gte: startOfToday },
        },
      }),
      prisma.message.count({
        where: {
          instagramAccountId,
          status: { in: ["pending", "sent"] },
          createdAt: { gte: startOfToday },
        },
      }),
    ]);

    const dailyLimit = account.dailyLimit || 50;
    const remainingToday = Math.max(dailyLimit - sentToday, 0);

    if (remainingToday <= 0) {
      return NextResponse.json({ 
        error: `Daily limit reached (${sentToday}/${dailyLimit})`, 
        sentToday,
        dailyLimit,
        processed: 0 
      }, { status: 429 });
    }

    // Process messages with automation logic
    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
      lastRecipientUsername: null as string | null,
      lastError: null as string | null,
      hardFailure: false,
      attemptRecipientUsername: null as string | null,
      attemptOutcome: null as null | "sent" | "failed" | "skipped",
      attemptError: null as string | null,
      attemptMs: null as number | null,
      attemptDebugTrace: null as string[] | null,
      attemptScreenshotPath: null as string | null,
    };

    for (const message of pendingMessages) {
      const attemptStart = Date.now();
      results.attemptRecipientUsername = message.recipientUsername;
      results.attemptOutcome = null;
      results.attemptError = null;
      results.attemptMs = null;
      results.attemptDebugTrace = null;
      results.attemptScreenshotPath = null;

      if (results.sent >= remainingToday) {
        results.skipped++;
        results.errors.push(`Daily limit reached. Stopped at ${results.sent}/${remainingToday} messages.`);
        results.attemptOutcome = "skipped";
        results.attemptMs = Date.now() - attemptStart;
        break;
      }

      try {
        if (!skipDelay) {
          const delay = getRandomDelay(delayMinMs, delayMaxMs);
          await sleep(delay);
        }

        if (senderMode === "playwright") {
          if (!account.password) {
            throw new Error("Missing Instagram password for this account. Re-add the account with a password.");
          }

          const decryptedPassword = decryptSecretMaybe(account.password, process.env.IG_CREDENTIALS_KEY);

          const r = await sendInstagramDmWithPlaywright({
            loginUsername: account.username,
            loginPassword: decryptedPassword,
            recipientUsername: message.recipientUsername,
            text: message.content,
            proxy: account.proxy,
            storageStateJson: account.connection ?? null,
            headless,
          });

          results.attemptDebugTrace = Array.isArray((r as any)?.debugTrace) ? (r as any).debugTrace.slice(-30) : null;
          results.attemptScreenshotPath = typeof (r as any)?.screenshotPath === "string" ? (r as any).screenshotPath : null;

          if (r.storageStateJson && r.storageStateJson !== (account.connection ?? null)) {
            await prisma.instagramAccount.update({
              where: { id: account.id },
              data: { connection: r.storageStateJson, lastLogin: new Date() },
            });
          }

          if (!r.ok) {
            throw new Error(r.error || "Playwright send failed");
          }
        }

        await prisma.message.update({
          where: { id: message.id },
          data: {
            status: "sent",
            sentAt: new Date(),
            error: null,
          },
        });

        results.sent++;
        results.processed++;
        results.lastRecipientUsername = message.recipientUsername;
        results.attemptOutcome = "sent";
        results.attemptMs = Date.now() - attemptStart;

        console.log(`Automated send: ${message.recipientUsername} via campaign ${campaign.name} (mode=${senderMode})`);
      } catch (error) {
        results.failed++;
        results.processed++;
        const errStr = error instanceof Error ? error.message : String(error);
        results.lastError = errStr;
        results.attemptError = errStr;
        results.errors.push(`Failed to send to ${message.recipientUsername}: ${errStr}`);
        results.lastRecipientUsername = message.recipientUsername;
        results.attemptOutcome = "failed";
        results.attemptMs = Date.now() - attemptStart;

        if (senderMode === "playwright" && isHardPlaywrightError(errStr)) {
          results.hardFailure = true;
        }
        
        // Debug: log classification
        console.log(`[DEBUG] Playwright error classification: hardFailure=${results.hardFailure} error="${errStr}"`);
        
        // Update message status to failed
        await prisma.message.update({
          where: { id: message.id },
          data: {
            status: "failed",
            error: errStr,
          },
        });

        // If the sender account is blocked (login/challenge/browser missing), stop processing more.
        if (results.hardFailure) {
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      mode: senderMode === "playwright" ? "playwright" : "simulated",
      ...results,
      campaignId,
      instagramAccountId,
      dailyLimit,
      sentToday,
      remainingToday: Math.max(remainingToday - results.sent, 0),
    });

  } catch (error: any) {
    console.error("Automation send error:", error);
    return NextResponse.json({ 
      error: error?.message || "Internal server error",
      processed: 0 
    }, { status: 500 });
  }
}

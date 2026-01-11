import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { ensureDbUser } from "@/lib/dbUser";
import { InstagramAPIClient, InstagramRateLimiter } from "@/lib/instagram-api";

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

    // Check daily limits
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    const [sentToday] = await prisma.message.count({
      where: {
        instagramAccountId,
        status: "sent",
        sentAt: { gte: startOfToday },
      },
    });

    // Check rate limits
    if (!InstagramRateLimiter.canSendMessage(new Date(), sentToday)) {
      const nextSendTime = InstagramRateLimiter.getNextSendTime(new Date());
      return NextResponse.json({
        error: "Rate limit reached. Please wait before sending more messages.",
        nextSendTime: nextSendTime.toISOString(),
        sentToday,
        dailyLimit: InstagramRateLimiter['DAILY_LIMIT'],
      }, { status: 429 });
    }

    try {
      // Initialize Instagram API client
      const instagramClient = new InstagramAPIClient(account.accessToken);

      // Send message via Instagram API
      const result = await instagramClient.sendMessage({
        recipient: message.recipientUsername,
        text: message.content,
        threadId: message.threadId || undefined,
      });

      if (result.success) {
        // Update message status to sent
        await prisma.message.update({
          where: { id: messageId },
          data: {
            status: "sent",
            sentAt: new Date(),
            threadId: result.threadId,
            error: null,
          },
        });

        return NextResponse.json({
          success: true,
          messageId: messageId,
          threadId: result.threadId,
          recipient: message.recipientUsername,
          sentAt: new Date().toISOString(),
        });
      } else {
        // Update message status to failed
        await prisma.message.update({
          where: { id: messageId },
          data: {
            status: "failed",
            error: result.error || "Unknown error",
            sentAt: new Date(),
          },
        });

        return NextResponse.json({
          success: false,
          error: result.error,
          messageId,
          recipient: message.recipientUsername,
        }, { status: 500 });
      }
    } catch (error) {
      console.error("Instagram send error:", error);
      
      // Update message status to failed
      await prisma.message.update({
        where: { id: messageId },
        data: {
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
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
    console.error("Send message API error:", error);
    return NextResponse.json({ 
      error: error?.message || "Internal server error" 
    }, { status: 500 });
  }
}

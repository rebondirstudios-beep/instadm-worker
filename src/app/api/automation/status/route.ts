import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { ensureDbUser } from "@/lib/dbUser";

export async function GET(request: NextRequest) {
  try {
    const clerkUser = await requireAuth();
    if (clerkUser instanceof NextResponse) return clerkUser;

    const dbUser = await ensureDbUser(clerkUser);
    const searchParams = request.nextUrl.searchParams;
    
    const campaignId = searchParams.get("campaignId") as string;
    const instagramAccountId = searchParams.get("instagramAccountId") as string;

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

    // Get message statistics
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [total, pending, sent, failed] = await Promise.all([
      prisma.message.count({
        where: { campaignId, instagramAccountId },
      }),
      prisma.message.count({
        where: { campaignId, instagramAccountId, status: "pending" },
      }),
      prisma.message.count({
        where: { campaignId, instagramAccountId, status: "sent" },
      }),
      prisma.message.count({
        where: { campaignId, instagramAccountId, status: "failed" },
      }),
    ]);

    const [sentToday] = await prisma.message.count({
      where: {
        campaignId,
        instagramAccountId,
        status: "sent",
        sentAt: { gte: startOfToday },
      },
    });

    const dailyLimit = account.dailyLimit || 50;
    const remainingToday = Math.max(dailyLimit - sentToday, 0);

    // Get recent messages for activity log
    const recentMessages = await prisma.message.findMany({
      where: { campaignId, instagramAccountId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        recipientUsername: true,
        status: true,
        sentAt: true,
        error: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
      },
      account: {
        id: account.id,
        username: account.username,
        isActive: account.isActive,
        dailyLimit,
      },
      statistics: {
        total,
        pending,
        sent,
        failed,
        sentToday,
        remainingToday,
      },
      recentActivity: recentMessages.map((msg: any) => ({
        ...msg,
        createdAt: msg.createdAt.toISOString(),
        sentAt: msg.sentAt?.toISOString() || null,
      })),
    });

  } catch (error: any) {
    console.error("Automation status error:", error);
    return NextResponse.json({ 
      error: error?.message || "Internal server error" 
    }, { status: 500 });
  }
}

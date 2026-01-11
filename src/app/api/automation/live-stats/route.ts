import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/clerk";
import { ensureDbUser } from "@/lib/dbUser";
import { prisma } from "@/lib/prisma";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  try {
    const clerkUser = await requireAuth();
    if (clerkUser instanceof NextResponse) return clerkUser;

    const dbUser = await ensureDbUser(clerkUser);

    const today = startOfToday();

    const [pending, sentToday, failedToday, lastSent] = await Promise.all([
      prisma.message.count({
        where: {
          campaign: { userId: dbUser.id },
          status: "pending",
        },
      }),
      prisma.message.count({
        where: {
          campaign: { userId: dbUser.id },
          status: "sent",
          sentAt: { gte: today },
        },
      }),
      prisma.message.count({
        where: {
          campaign: { userId: dbUser.id },
          status: "failed",
          createdAt: { gte: today },
        },
      }),
      prisma.message.findFirst({
        where: {
          campaign: { userId: dbUser.id },
          status: "sent",
          sentAt: { not: null },
        },
        orderBy: { sentAt: "desc" },
        select: { sentAt: true, recipientUsername: true, campaignId: true, instagramAccountId: true },
      }),
    ]);

    return NextResponse.json({
      pending,
      sentToday,
      failedToday,
      lastSentAt: lastSent?.sentAt ? lastSent.sentAt.toISOString() : null,
      lastSentTo: lastSent?.recipientUsername || null,
      lastSentCampaignId: lastSent?.campaignId || null,
      lastSentInstagramAccountId: lastSent?.instagramAccountId || null,
      serverTime: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

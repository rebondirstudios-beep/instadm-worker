import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { ensureDbUser } from "@/lib/dbUser";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function normalizeUsername(u: string) {
  const s = u.trim();
  if (!s) return "";
  return s.startsWith("@") ? s.slice(1) : s;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const clerkUser = await requireAuth();
    if (clerkUser instanceof NextResponse) return clerkUser;

    const dbUser = await ensureDbUser(clerkUser);
    const { id: campaignId } = await context.params;

    const body = await request.json();
    const instagramAccountId = body?.instagramAccountId as string | undefined;
    const limitRaw = body?.limit;
    const usernamesRaw = body?.usernames;

    if (!instagramAccountId) {
      return NextResponse.json(
        { error: "instagramAccountId is required" },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId: dbUser.id },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const account = await prisma.instagramAccount.findFirst({
      where: { id: instagramAccountId, userId: dbUser.id },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const template = campaign.messageTemplateId
      ? await prisma.messageTemplate.findFirst({
          where: { id: campaign.messageTemplateId, userId: dbUser.id },
        })
      : null;

    const leadUsernamesRaw = (campaign.settings as any)?.leadUsernames;
    const leadUsernames = Array.isArray(leadUsernamesRaw)
      ? leadUsernamesRaw.map((u: any) => normalizeUsername(String(u))).filter(Boolean)
      : [];

    if (leadUsernames.length === 0) {
      return NextResponse.json(
        { error: "No lead usernames found on this campaign" },
        { status: 400 }
      );
    }

    // If explicit usernames are provided (Queue All), use them; otherwise use limit logic
    const explicitUsernames = Array.isArray(usernamesRaw)
      ? usernamesRaw.map((u: any) => normalizeUsername(String(u))).filter(Boolean)
      : null;

    const today = startOfToday();

    const sentToday = await prisma.message.count({
      where: {
        instagramAccountId: account.id,
        status: "sent",
        sentAt: { gte: today },
      },
    });

    const usedToday = await prisma.message.count({
      where: {
        instagramAccountId: account.id,
        status: { in: ["pending", "sent"] },
        createdAt: { gte: today },
      },
    });

    const dailyLimit = account.dailyLimit ?? 50;
    const available = Math.max(dailyLimit - usedToday, 0);

    let toQueue: string[] = [];

    if (explicitUsernames) {
      // Queue All: filter by daily limit and already-queued
      const seen = new Set(
        (
          await prisma.message.findMany({
            where: {
              campaignId,
              recipientUsername: { in: explicitUsernames },
            },
            select: { recipientUsername: true },
          })
        ).map((e: any) => String(e.recipientUsername).toLowerCase())
      );
      for (const u of explicitUsernames) {
        if (toQueue.length >= available) break;
        const key = u.toLowerCase();
        if (seen.has(key)) continue;
        toQueue.push(u);
      }
    } else {
      // Existing limit-based logic
      const limit =
        typeof limitRaw === "number"
          ? limitRaw
          : typeof limitRaw === "string"
            ? Number(limitRaw)
            : account.dailyLimit ?? 50;
      const desired = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : available;
      const queueCount = Math.min(available, desired);

      if (queueCount <= 0) {
        return NextResponse.json(
          {
            error: `Daily limit reached for @${account.username}. (${sentToday}/${dailyLimit})`,
          },
          { status: 400 }
        );
      }

      const existing = await prisma.message.findMany({
        where: {
          campaignId,
          recipientUsername: { in: leadUsernames },
        },
        select: { recipientUsername: true },
      });

      const seen = new Set(existing.map((e: any) => String(e.recipientUsername).toLowerCase()));
      for (const u of leadUsernames) {
        const key = u.toLowerCase();
        if (seen.has(key)) continue;
        toQueue.push(u);
        if (toQueue.length >= queueCount) break;
      }
    }

    if (toQueue.length === 0) {
      const leadCount = explicitUsernames ? explicitUsernames.length : leadUsernames.length;
      const alreadyUsedInCampaign = explicitUsernames
        ? await prisma.message.count({
            where: {
              campaignId,
              recipientUsername: { in: explicitUsernames },
            },
          })
        : await prisma.message.count({
            where: {
              campaignId,
              recipientUsername: { in: leadUsernames },
            },
          });

      return NextResponse.json(
        {
          error:
            available <= 0
              ? `No new usernames to queue: daily limit reached for @${account.username} (${sentToday}/${dailyLimit})`
              : "No new usernames to queue: all campaign leads have already been queued (sent/failed/pending)",
          leadCount,
          alreadyUsedInCampaign,
          dailyLimit,
          sentToday,
          usedToday,
          availableToday: available,
        },
        { status: 400 }
      );
    }

    const baseContent = template?.content ?? "";

    const created = await prisma.$transaction(
      toQueue.map((recipientUsername: string) =>
        prisma.message.create({
          data: {
            campaignId,
            instagramAccountId: account.id,
            recipientUsername,
            content: baseContent
              ? baseContent.replaceAll("{username}", recipientUsername)
              : `Hi @${recipientUsername}!`,
            status: "pending",
          },
        })
      )
    );

    return NextResponse.json({
      queued: created.length,
      dailyLimit,
      sentToday,
      remainingToday: Math.max(dailyLimit - usedToday - created.length, 0),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

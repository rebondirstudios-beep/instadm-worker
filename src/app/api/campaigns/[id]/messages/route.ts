import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { ensureDbUser } from "@/lib/dbUser";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const clerkUser = await requireAuth();
    if (clerkUser instanceof NextResponse) return clerkUser;

    const dbUser = await ensureDbUser(clerkUser);
    const { id: campaignId } = await context.params;

    const url = new URL(request.url);
    const instagramAccountId = url.searchParams.get("instagramAccountId");

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId: dbUser.id },
      select: { id: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: {
        campaignId,
        ...(instagramAccountId ? { instagramAccountId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json({
      messages: messages.map((m: any) => ({
        id: m.id,
        campaignId: m.campaignId,
        instagramAccountId: m.instagramAccountId,
        recipientUsername: m.recipientUsername,
        content: m.content,
        status: m.status,
        sentAt: m.sentAt ? m.sentAt.toISOString() : null,
        createdAt: m.createdAt.toISOString(),
        error: m.error ?? null,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

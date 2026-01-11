import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { ensureDbUser } from "@/lib/dbUser";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const clerkUser = await requireAuth();
    if (clerkUser instanceof NextResponse) return clerkUser;

    const dbUser = await ensureDbUser(clerkUser);
    const { id: messageId } = await context.params;

    const body = await request.json();
    const status = body?.status as string | undefined;

    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const existing = await prisma.message.findFirst({
      where: { id: messageId },
      include: {
        campaign: { select: { userId: true } },
      },
    });

    if (!existing || existing.campaign.userId !== dbUser.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        status,
        sentAt: status === "sent" ? new Date() : existing.sentAt,
        error: typeof body?.error === "string" ? body.error : undefined,
      },
    });

    return NextResponse.json({
      message: {
        id: updated.id,
        campaignId: updated.campaignId,
        instagramAccountId: updated.instagramAccountId,
        recipientUsername: updated.recipientUsername,
        content: updated.content,
        status: updated.status,
        sentAt: updated.sentAt ? updated.sentAt.toISOString() : null,
        createdAt: updated.createdAt.toISOString(),
        error: updated.error ?? null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

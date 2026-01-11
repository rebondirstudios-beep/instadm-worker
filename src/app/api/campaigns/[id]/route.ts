import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { ensureDbUser } from "@/lib/dbUser";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const clerkUser = await requireAuth();
    if (clerkUser instanceof NextResponse) return clerkUser;

    const dbUser = await ensureDbUser(clerkUser);
    const { id: campaignId } = await context.params;

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId: dbUser.id },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description ?? "",
        status: campaign.status as any,
        messageTemplateId: campaign.messageTemplateId ?? null,
        targetCriteria: (campaign.targetCriteria as any) ?? {},
        schedule: (campaign.schedule as any) ?? {},
        settings: (campaign.settings as any) ?? {},
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
        stats: {
          messagesSent: 0,
          messagesDelivered: 0,
          messagesRead: 0,
          successRate: 0,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const clerkUser = await requireAuth();
    if (clerkUser instanceof NextResponse) return clerkUser;

    const dbUser = await ensureDbUser(clerkUser);
    const { id: campaignId } = await context.params;

    const body = await request.json();

    const updated = await prisma.campaign.updateMany({
      where: { id: campaignId, userId: dbUser.id },
      data: {
        name: typeof body?.name === "string" ? body.name : undefined,
        description: typeof body?.description === "string" ? body.description : undefined,
        status: typeof body?.status === "string" ? body.status : undefined,
        messageTemplateId:
          body?.messageTemplateId === null
            ? null
            : typeof body?.messageTemplateId === "string"
              ? body.messageTemplateId
              : undefined,
        targetCriteria: body?.targetCriteria !== undefined ? body.targetCriteria : undefined,
        schedule: body?.schedule !== undefined ? body.schedule : undefined,
        settings: body?.settings !== undefined ? body.settings : undefined,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId: dbUser.id },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description ?? "",
        status: campaign.status as any,
        messageTemplateId: campaign.messageTemplateId ?? null,
        targetCriteria: (campaign.targetCriteria as any) ?? {},
        schedule: (campaign.schedule as any) ?? {},
        settings: (campaign.settings as any) ?? {},
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
        stats: {
          messagesSent: 0,
          messagesDelivered: 0,
          messagesRead: 0,
          successRate: 0,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const clerkUser = await requireAuth();
    if (clerkUser instanceof NextResponse) return clerkUser;

    const dbUser = await ensureDbUser(clerkUser);
    const { id: campaignId } = await context.params;

    const deleted = await prisma.campaign.deleteMany({
      where: { id: campaignId, userId: dbUser.id },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

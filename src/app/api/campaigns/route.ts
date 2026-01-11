import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { ensureDbUser } from "@/lib/dbUser";

export async function GET() {
  try {
    const clerkUser = await requireAuth();
    if (clerkUser instanceof NextResponse) return clerkUser;

    const dbUser = await ensureDbUser(clerkUser);

    const campaigns = await prisma.campaign.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      campaigns: campaigns.map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description ?? "",
        status: c.status as any,
        messageTemplateId: c.messageTemplateId ?? null,
        targetCriteria: (c.targetCriteria as any) ?? {},
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        stats: {
          messagesSent: 0,
          messagesDelivered: 0,
          messagesRead: 0,
          successRate: 0,
        },
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const clerkUser = await requireAuth();
    if (clerkUser instanceof NextResponse) return clerkUser;

    const dbUser = await ensureDbUser(clerkUser);

    const body = await request.json();

    const name = body?.name as string | undefined;
    const status = (body?.status as string | undefined) ?? "draft";

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const campaign = await prisma.campaign.create({
      data: {
        userId: dbUser.id,
        name,
        description: typeof body?.description === "string" ? body.description : null,
        status,
        messageTemplateId:
          typeof body?.messageTemplateId === "string" && body.messageTemplateId
            ? body.messageTemplateId
            : null,
        targetCriteria: body?.targetCriteria ?? null,
        schedule: body?.schedule ?? null,
        settings: body?.settings ?? null,
      },
    });

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description ?? "",
        status: campaign.status as any,
        messageTemplateId: campaign.messageTemplateId ?? null,
        targetCriteria: (campaign.targetCriteria as any) ?? {},
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

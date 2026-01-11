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
    const { id: templateId } = await context.params;

    const template = await prisma.messageTemplate.findFirst({
      where: { id: templateId, userId: dbUser.id },
    });

    if (!template) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        content: template.content,
        variables: (template.variables as any) ?? [],
        isActive: template.isActive,
        usage: 0,
        successRate: 0,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
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
    const { id: templateId } = await context.params;

    const body = await request.json();

    const updated = await prisma.messageTemplate.updateMany({
      where: { id: templateId, userId: dbUser.id },
      data: {
        name: typeof body?.name === "string" ? body.name : undefined,
        content: typeof body?.content === "string" ? body.content : undefined,
        variables: body?.variables !== undefined ? body.variables : undefined,
        isActive: typeof body?.isActive === "boolean" ? body.isActive : undefined,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const template = await prisma.messageTemplate.findFirst({
      where: { id: templateId, userId: dbUser.id },
    });

    if (!template) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        content: template.content,
        variables: (template.variables as any) ?? [],
        isActive: template.isActive,
        usage: 0,
        successRate: 0,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
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
    const { id: templateId } = await context.params;

    const deleted = await prisma.messageTemplate.deleteMany({
      where: { id: templateId, userId: dbUser.id },
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

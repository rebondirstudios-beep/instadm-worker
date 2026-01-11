import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/clerk";
import { prisma, getPrisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const clerkUser = await requireAuth();
    if (clerkUser instanceof NextResponse) return clerkUser;

    const db = prisma ?? (await getPrisma());

    const { id } = await context.params;

    const list = await db.leadList.findFirst({
      where: { id, userId: clerkUser.id },
      select: {
        id: true,
        name: true,
        usernames: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    return NextResponse.json({ list });
  } catch (e: any) {
    console.error("GET /api/lead-lists/[id] error:", e);
    return NextResponse.json({ error: e?.message || "Failed to fetch list" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const clerkUser = await requireAuth();
    if (clerkUser instanceof NextResponse) return clerkUser;

    const db = prisma ?? (await getPrisma());

    const { id } = await context.params;

    const list = await db.leadList.findFirst({
      where: { id, userId: clerkUser.id },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    await db.leadList.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("DELETE /api/lead-lists/[id] error:", e);
    return NextResponse.json({ error: e?.message || "Failed to delete list" }, { status: 500 });
  }
}

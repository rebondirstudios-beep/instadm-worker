import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/clerk";
import { prisma, getPrisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const clerkUser = await requireAuth();
    if (clerkUser instanceof NextResponse) return clerkUser;

    const db = prisma ?? (await getPrisma());

    const lists = await db.leadList.findMany({
      where: { userId: clerkUser.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        usernames: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ lists });
  } catch (e: any) {
    console.error("GET /api/lead-lists error:", e);
    return NextResponse.json({ error: e?.message || "Failed to fetch lists" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const clerkUser = await requireAuth();
    if (clerkUser instanceof NextResponse) return clerkUser;

    console.log("POST /api/lead-lists: ensuring db");
    const db = prisma ?? (await getPrisma());
    console.log("POST /api/lead-lists: db obtained", typeof db, db && typeof db.leadList);

    const body = await request.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const usernames = Array.isArray(body?.usernames) ? body.usernames : [];

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    console.log("POST /api/lead-lists: about to call findFirst");
    const existing = await db.leadList.findFirst({
      where: { userId: clerkUser.id, name },
    });
    console.log("POST /api/lead-lists: findFirst done");

    if (existing) {
      return NextResponse.json({ error: "A list with this name already exists" }, { status: 409 });
    }

    const list = await db.leadList.create({
      data: {
        userId: clerkUser.id,
        name,
        usernames,
      },
    });

    return NextResponse.json({ list });
  } catch (e: any) {
    console.error("POST /api/lead-lists error:", e);
    return NextResponse.json({ error: e?.message || "Failed to create list" }, { status: 500 });
  }
}

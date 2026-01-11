import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { ensureDbUser } from "@/lib/dbUser";
import { encryptSecretMaybe } from "@/lib/crypto";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const clerkUser = await requireAuth();
    if (clerkUser instanceof NextResponse) return clerkUser;

    const dbUser = await ensureDbUser(clerkUser);
    const { id: accountId } = await context.params;

    const body = await request.json();

    const updated = await prisma.instagramAccount.updateMany({
      where: { id: accountId, userId: dbUser.id },
      data: {
        username: typeof body?.username === "string" ? body.username : undefined,
        password:
          typeof body?.password === "string"
            ? body.password.length
              ? encryptSecretMaybe(body.password, process.env.IG_CREDENTIALS_KEY)
              : ""
            : undefined,
        proxy: body?.proxy === null ? null : typeof body?.proxy === "string" ? body.proxy : undefined,
        isActive: typeof body?.isActive === "boolean" ? body.isActive : undefined,
        dailyLimit:
          typeof body?.dailyLimit === "number"
            ? body.dailyLimit
            : typeof body?.dailyLimit === "string"
              ? Number(body.dailyLimit)
              : undefined,
      },
    });

    if (updated.count === 0) {
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

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const clerkUser = await requireAuth();
    if (clerkUser instanceof NextResponse) return clerkUser;

    const dbUser = await ensureDbUser(clerkUser);
    const { id: accountId } = await context.params;

    const deleted = await prisma.instagramAccount.deleteMany({
      where: { id: accountId, userId: dbUser.id },
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

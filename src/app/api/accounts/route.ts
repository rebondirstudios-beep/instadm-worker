import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { ensureDbUser } from "@/lib/dbUser";
import { encryptSecretMaybe } from "@/lib/crypto";

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

    const accounts = await prisma.instagramAccount.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
    });

    const today = startOfToday();

    const rows = await Promise.all(
      accounts.map(async (a: any) => {
        const sentToday = await prisma.message.count({
          where: {
            instagramAccountId: a.id,
            status: "sent",
            sentAt: { gte: today },
          },
        });

        const sentTotal = await prisma.message.count({
          where: {
            instagramAccountId: a.id,
            status: "sent",
          },
        });

        return {
          id: a.id,
          username: a.username,
          isActive: a.isActive,
          lastLogin: a.lastLogin ? a.lastLogin.toISOString() : "",
          proxy: a.proxy ?? null,
          status: "connected",
          stats: {
            messagesSent: sentTotal,
            successRate: 0,
            dailyLimit: a.dailyLimit ?? 50,
            dailyUsed: sentToday,
          },
          createdAt: a.createdAt.toISOString(),
        };
      })
    );

    return NextResponse.json({ accounts: rows });
  } catch (error: any) {
    console.error("Accounts GET error:", error);
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
    const username = body?.username as string | undefined;
    const password = body?.password as string | undefined;
    const proxy = (body?.proxy as string | undefined) ?? null;
    const dailyLimitRaw = body?.dailyLimit;

    if (!username) {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }

    const dailyLimit =
      typeof dailyLimitRaw === "number"
        ? dailyLimitRaw
        : typeof dailyLimitRaw === "string"
          ? Number(dailyLimitRaw)
          : 50;

    const account = await prisma.instagramAccount.create({
      data: {
        userId: dbUser.id,
        username,
        password:
          typeof password === "string" && password.length
            ? encryptSecretMaybe(password, process.env.IG_CREDENTIALS_KEY)
            : "",
        proxy,
        isActive: true,
        dailyLimit: Number.isFinite(dailyLimit) && dailyLimit > 0 ? dailyLimit : 50,
      },
    });

    return NextResponse.json({
      account: {
        id: account.id,
        username: account.username,
        isActive: account.isActive,
        lastLogin: "",
        proxy: account.proxy ?? null,
        status: "connected",
        stats: {
          messagesSent: 0,
          successRate: 0,
          dailyLimit: account.dailyLimit ?? 50,
          dailyUsed: 0,
        },
        createdAt: account.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Accounts POST error:", error);

    const message = String(error?.message || "");
    if (message.includes("Unknown argument `dailyLimit`")) {
      return NextResponse.json(
        {
          error:
            "Server is using a stale Prisma Client (does not include `dailyLimit`). Restart `next dev` and try again.",
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

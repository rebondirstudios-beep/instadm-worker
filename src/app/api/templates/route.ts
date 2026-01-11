import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { ensureDbUser } from "@/lib/dbUser";

export async function GET() {
  try {
    const clerkUser = await requireAuth();
    if (clerkUser instanceof NextResponse) return clerkUser;

    const dbUser = await ensureDbUser(clerkUser);

    const swariyaName = "Swariya - Premium Venue Outreach";
    const swariyaContent = `Hi {username},

We’re Swariya, a wedding planning company that works directly with couples to plan their dream weddings. We also feature premium venues like yours, helping you get real leads, increased visibility, and more bookings.

With Swariya, your venue can:

* Showcase photos, packages & real weddings beautifully
* Track inquiries & follow-ups easily
* Get featured on social media & online channels

We’d love to feature you as a Premium Venue on Swariya.

Can we schedule a quick chat to discuss?

www.swariya.com`;

    const existingSwariya = await prisma.messageTemplate.findFirst({
      where: { userId: dbUser.id, name: swariyaName },
      select: { id: true },
    });

    if (!existingSwariya) {
      await prisma.messageTemplate.create({
        data: {
          userId: dbUser.id,
          name: swariyaName,
          content: swariyaContent,
          variables: [
            {
              name: "username",
              type: "text",
              defaultValue: "",
              required: false,
            },
          ],
          isActive: true,
        },
      });
    }

    const templates = await prisma.messageTemplate.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      templates: templates.map((t: any) => ({
        id: t.id,
        name: t.name,
        content: t.content,
        variables: (t.variables as any) ?? [],
        isActive: t.isActive,
        usage: 0,
        successRate: 0,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
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
    const content = body?.content as string | undefined;
    const variables = body?.variables;
    const isActive = body?.isActive;

    if (!name || !content) {
      return NextResponse.json(
        { error: "name and content are required" },
        { status: 400 }
      );
    }

    const template = await prisma.messageTemplate.create({
      data: {
        userId: dbUser.id,
        name,
        content,
        variables: variables ?? [],
        isActive: typeof isActive === "boolean" ? isActive : true,
      },
    });

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

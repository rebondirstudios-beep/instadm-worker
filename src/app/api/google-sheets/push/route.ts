import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/clerk";

export async function POST(request: NextRequest) {
  try {
    const clerkUser = await requireAuth();
    if (clerkUser instanceof NextResponse) return clerkUser;

    const body = await request.json().catch(() => ({}));
    const sheetUrl = typeof body?.sheetUrl === "string" ? body.sheetUrl.trim() : "";
    const usernames = Array.isArray(body?.usernames) ? body.usernames : [];

    if (!sheetUrl) {
      return NextResponse.json({ error: "sheetUrl is required" }, { status: 400 });
    }
    if (!usernames.length) {
      return NextResponse.json({ error: "usernames is required" }, { status: 400 });
    }

    // Manual copy workflow: use "Copy to Google Sheets" button instead
    return NextResponse.json({
      error: "Automatic push disabled. Use 'Copy to Google Sheets' to paste manually.",
    }, { status: 501 });

  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 });
  }
}

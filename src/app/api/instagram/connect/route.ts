import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { ensureDbUser } from "@/lib/dbUser";
import { InstagramAPIClient } from "@/lib/instagram-api";

export async function POST(request: NextRequest) {
  try {
    const clerkUser = await requireAuth();
    if (clerkUser instanceof NextResponse) return clerkUser;

    const dbUser = await ensureDbUser(clerkUser);
    const body = await request.json().catch(() => ({}));
    
    const { accountId, username, password } = body;
    
    if (!accountId || !username || !password) {
      return NextResponse.json({ error: "accountId, username, and password are required" }, { status: 400 });
    }

    // Get account from database
    const account = await prisma.instagramAccount.findFirst({
      where: { id: accountId, userId: dbUser.id },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    try {
      // Create Instagram session
      const instagramClient = new InstagramAPIClient("dummy_token"); // Would use real OAuth flow
      const session = await instagramClient.createSession(username, password);

      // In production, you'd get real access token here
      const accessToken = "dummy_access_token"; // Replace with actual token from OAuth

      // Update account with access token
      await prisma.instagramAccount.update({
        where: { id: accountId },
        data: {
          accessToken,
          lastConnectedAt: new Date(),
          isActive: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Instagram account connected successfully",
        account: {
          id: account.id,
          username: account.username,
          isConnected: true,
        },
      });

    } catch (error) {
      console.error("Instagram connection error:", error);
      
      // Mark account as inactive on connection failure
      await prisma.instagramAccount.update({
        where: { id: accountId },
        data: {
          isActive: false,
          lastError: error instanceof Error ? error.message : "Connection failed",
        },
      });

      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to connect Instagram account",
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Connect API error:", error);
    return NextResponse.json({ 
      error: error?.message || "Internal server error" 
    }, { status: 500 });
  }
}

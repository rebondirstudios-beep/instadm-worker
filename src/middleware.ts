import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing",
  "/login(.*)",
  "/signup(.*)",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  try {
    if (isPublicRoute(req)) {
      return NextResponse.next();
    }

    const { userId } = await auth();
    if (!userId) {
      const pathname = req.nextUrl.pathname;
      if (pathname.startsWith("/api") || pathname.startsWith("/trpc")) {
        return new Response("Unauthorized", { status: 401 });
      }

      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  } catch (err) {
    console.error("Clerk middleware error", err);
    return NextResponse.next();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};

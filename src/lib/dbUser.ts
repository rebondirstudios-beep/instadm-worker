import { prisma } from "@/lib/prisma";

export async function ensureDbUser(clerkUser: any) {
  if (!prisma) {
    throw new Error(
      "Database is not initialized. Create .env.local from .env.example and run: npx prisma db push"
    );
  }

  const clerkId = clerkUser?.id as string | undefined;
  const email = (clerkUser?.emailAddresses?.[0]?.emailAddress as string | undefined) ?? "";

  if (!clerkId) {
    throw new Error("Missing Clerk user id");
  }

  const dbUser = await prisma.user.upsert({
    where: { clerkId },
    update: { email },
    create: { clerkId, email },
  });

  return dbUser;
}

type PrismaClientType = any;

declare global {
  var prisma: PrismaClientType | undefined;
}

let PrismaClientCtor: any = null;

try {
  PrismaClientCtor = (require("@prisma/client") as any).PrismaClient as any;
} catch {
  PrismaClientCtor = null;
}

export const prisma: PrismaClientType =
  globalThis.prisma ?? (PrismaClientCtor ? new PrismaClientCtor() : null);

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;

export async function getPrisma(): Promise<PrismaClientType> {
  if (prisma) {
    console.log("getPrisma: using cached prisma");
    return prisma;
  }
  console.log("getPrisma: attempting dynamic import");
  try {
    const { PrismaClient } = await import("@prisma/client");
    const client = new PrismaClient();
    if (process.env.NODE_ENV !== "production") (globalThis as any).prisma = client;
    console.log("getPrisma: dynamic import succeeded");
    return client;
  } catch (e) {
    console.error("getPrisma: dynamic import failed", e);
    throw new Error("Failed to load Prisma client");
  }
}

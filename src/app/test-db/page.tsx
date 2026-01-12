import { prisma } from "@/lib/prisma";

export default async function TestDbPage() {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-green-600 mb-4">
            Database Connected
          </h1>
          <p className="text-gray-600">
            Database connection is working properly.
          </p>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Database error:", error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Database Error
          </h1>
          <p className="text-gray-600">
            {error instanceof Error ? error.message : 'Unknown database error'}
          </p>
        </div>
      </div>
    );
  }
}

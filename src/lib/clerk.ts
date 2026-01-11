import { clerkClient, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Initialize Clerk client with error handling
let clerk: ReturnType<typeof clerkClient>;

try {
  if (process.env.CLERK_SECRET_KEY) {
    clerk = clerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });
  }
} catch (error) {
  console.error('Failed to initialize Clerk client:', error);
}

export async function getUser() {
  if (!clerk) {
    console.error('Clerk client not initialized')
    return null
  }
  const user = await currentUser({ clerk })
  if (!user) {
    return null
  }
  return user
}

export async function requireAuth() {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return user
}

export async function createUserInDatabase(user: any) {
  try {
    // This would create the user in your database
    // For now, we'll just return the user object
    return {
      id: user.id,
      clerkId: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  } catch (error) {
    console.error('Error creating user in database:', error)
    throw error
  }
}

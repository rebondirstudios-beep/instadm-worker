import { clerkClient, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function getUser() {
  const user = await currentUser()
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

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/clerk'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user

    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Instagram authentication is not implemented yet.' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Instagram auth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

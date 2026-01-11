import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/clerk'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user

    const { accountId, recipientUsername, message } = await request.json()

    if (!accountId || !recipientUsername || !message) {
      return NextResponse.json(
        { error: 'Account ID, recipient username, and message are required' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Sending messages is not implemented yet.' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

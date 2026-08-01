import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: { users }, error: listError } = await admin.auth.admin.listUsers()

    if (listError) {
      return NextResponse.json({ error: 'Failed to look up user' }, { status: 500 })
    }

    const target = users.find((u) => u.email?.toLowerCase() === email.toLowerCase())

    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(target.id, {
      email_confirm: true,
    })

    if (updateError) {
      return NextResponse.json({ error: 'Failed to confirm email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in auto-confirm:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

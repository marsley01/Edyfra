import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createAdminClient } from '@/utils/supabase/admin'

/**
 * Confirms the email of an existing account so a password sign-in can proceed.
 * The app does not require email verification; accounts created before signup
 * moved server-side may still be marked unconfirmed in GoTrue.
 *
 * The id comes from Prisma rather than `admin.listUsers()`, which only returns
 * the first page (50 users) — every later account was reported as not found and
 * could never sign in. Only accounts with a Prisma row are confirmed.
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const target = await prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
      select: { id: true },
    })

    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const admin = createAdminClient()
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

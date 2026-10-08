import { NextResponse } from 'next/server'
import { z } from 'zod'

import { EduLevel, Gender, Role, Tier } from '@/generated/client'
import { SESSION_CONFIG } from '@/lib/config'
import prisma from '@/lib/prisma'
import { createAdminClient } from '@/utils/supabase/admin'
import { generateReferralCode } from '@/utils/referral'

export const runtime = 'nodejs'

/**
 * Email/password registration.
 *
 * Previously the browser called `supabase.auth.signUp()` and then POSTed the
 * result to an unauthenticated `/api/auth/sync-user`, which upserted any id with
 * any role (including ADMIN). That split also broke in practice: when GoTrue
 * hid an existing account behind an obfuscated user, the sync hit a unique
 * constraint and the user was stranded with half an account.
 *
 * Doing both writes here, with the service role, means the auth user and the
 * Prisma row are created together (or not at all), the role is always STUDENT,
 * and no confirmation email is needed — the app has never required one. The
 * browser signs in with `signInWithPassword` afterwards so the session cookies
 * are written by the client as usual.
 */

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name').max(100),
  email: z.string().trim().toLowerCase().email("That doesn't look like a valid email").max(254),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, 'Username must be 3–20 letters, numbers, or underscores'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  avatar: z.string().max(2048).regex(/^https:\/\//, 'Invalid avatar').optional().or(z.literal('')),
})

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status })
}

function isAlreadyRegistered(message: string | undefined): boolean {
  return /already (been )?registered|already exists/i.test(message ?? '')
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail('Invalid request', 400)
  }

  const parsed = signupSchema.safeParse(body)
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message || 'Invalid details', 400)
  }
  const { name, email, username, password, gender, avatar } = parsed.data

  try {
    const [emailOwner, usernameOwner] = await Promise.all([
      prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } }),
      prisma.user.findFirst({ where: { username: { equals: username, mode: 'insensitive' } }, select: { id: true } }),
    ])
    if (emailOwner) {
      return fail('An account with this email already exists. Try signing in instead.', 409)
    }
    if (usernameOwner) {
      return fail('That username was just taken. Go back and pick another one.', 409)
    }

    const admin = createAdminClient()
    const metadata = { name, username, gender, avatar: avatar || undefined }

    let userId: string
    let createdNow = false

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    })

    if (createError || !created?.user) {
      if (!isAlreadyRegistered(createError?.message)) {
        console.error('[auth/signup] createUser failed:', createError?.message)
        return fail(createError?.message || 'Could not create your account. Please try again.', 400)
      }

      // An auth user exists with no Prisma row: a previous signup died halfway.
      // Only reclaim it if nobody has ever signed into it — otherwise it is a
      // real account and the owner should log in or reset their password.
      const orphan = await findOrphanAuthUser(email)
      if (!orphan) {
        return fail('An account with this email already exists. Try signing in, or reset your password.', 409)
      }
      const { error: reclaimError } = await admin.auth.admin.updateUserById(orphan, {
        password,
        email_confirm: true,
        user_metadata: metadata,
      })
      if (reclaimError) {
        console.error('[auth/signup] reclaim failed:', reclaimError.message)
        return fail('Could not create your account. Please try again.', 500)
      }
      userId = orphan
    } else {
      userId = created.user.id
      createdNow = true
    }

    try {
      await prisma.user.create({
        data: {
          id: userId,
          email,
          name,
          username,
          role: Role.STUDENT,
          educationLevel: EduLevel.HIGH_SCHOOL,
          county: 'Nairobi',
          tier: Tier.BRONZE,
          gender: gender ? Gender[gender] : undefined,
          avatar: avatar || null,
          referralCode: generateReferralCode(name),
          points: SESSION_CONFIG.NEW_USER_WELCOME_BONUS,
        },
      })
    } catch (dbError) {
      console.error('[auth/signup] Prisma create failed:', dbError)
      // Roll back so the email is not left registered without a usable account.
      if (createdNow) {
        await admin.auth.admin.deleteUser(userId).catch(() => {})
      }
      const code = (dbError as { code?: string })?.code
      if (code === 'P2002') {
        return fail('That email or username was just taken. Please try again.', 409)
      }
      return fail('Could not save your account. Please try again.', 500)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[auth/signup] unexpected error:', error)
    return fail('Something went wrong. Please try again.', 500)
  }
}

/**
 * Returns the id of an auth user for `email` that has never signed in and has
 * no Prisma row, or null. Reads `auth.users` directly because the admin API has
 * no lookup-by-email and `listUsers()` only returns the first page.
 */
async function findOrphanAuthUser(email: string): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<{ id: string; last_sign_in_at: Date | null }[]>`
      SELECT id::text AS id, last_sign_in_at FROM auth.users WHERE lower(email) = ${email} LIMIT 1
    `
    const row = rows[0]
    if (!row || row.last_sign_in_at) return null
    const hasProfile = await prisma.user.findUnique({ where: { id: row.id }, select: { id: true } })
    return hasProfile ? null : row.id
  } catch (error) {
    console.error('[auth/signup] orphan lookup failed:', error)
    return null
  }
}

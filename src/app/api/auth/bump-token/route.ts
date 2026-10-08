import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Increment tokenVersion in our DB
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { tokenVersion: { increment: 1 } },
    select: { tokenVersion: true },
  })

  // Sign out every other Supabase session for this user. `admin.signOut` takes
  // the caller's access token (not a user id) and the scope to revoke.
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      await createAdminClient().auth.admin.signOut(session.access_token, 'others')
    }
  } catch {
    // Non-critical — tokenVersion still prevents old sessions
  }

  return NextResponse.json({ ok: true, tokenVersion: updated.tokenVersion })
}

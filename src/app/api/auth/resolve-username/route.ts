import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim().replace(/^@/, '')

  if (!q) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 })
  }

  // Usernames are stored lowercase by the signup form, but older rows may not
  // be, so match case-insensitively instead of failing a correct username.
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: { equals: q, mode: 'insensitive' } },
        ...(q.includes('@') ? [{ email: { equals: q, mode: 'insensitive' as const } }] : []),
      ],
    },
    select: { email: true },
  })

  if (!user) {
    return NextResponse.json({ found: false })
  }

  return NextResponse.json({ found: true, email: user.email })
}

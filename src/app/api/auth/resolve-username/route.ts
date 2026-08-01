import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')

  if (!q) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 })
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: q },
        ...(q.includes('@') ? [{ email: q }] : []),
      ],
    },
    select: { email: true, username: true, name: true },
  })

  if (!user) {
    return NextResponse.json({ found: false })
  }

  return NextResponse.json({ found: true, email: user.email, username: user.username, name: user.name })
}

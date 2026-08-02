import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('q')

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ available: false })
  }

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true },
  })

  return NextResponse.json({ available: !existing })
}

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('q')?.trim()

  if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return NextResponse.json({ available: false })
  }

  const existing = await prisma.user.findFirst({
    where: { username: { equals: username, mode: 'insensitive' } },
    select: { id: true },
  })

  return NextResponse.json({ available: !existing })
}

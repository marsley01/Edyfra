import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('q')

  if (!username || username.length < 2) {
    return NextResponse.json({ available: false })
  }

  const existing = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  })

  return NextResponse.json({ available: !existing })
}

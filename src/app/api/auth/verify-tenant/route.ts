import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code || code.length < 2) {
    return NextResponse.json({ found: false, error: 'Missing code' }, { status: 400 })
  }

  const institution = await prisma.institution.findUnique({
    where: { code },
    select: { id: true, name: true, logo: true, type: true, location: true },
  })

  if (!institution) {
    return NextResponse.json({ found: false })
  }

  return NextResponse.json({ found: true, institution })
}

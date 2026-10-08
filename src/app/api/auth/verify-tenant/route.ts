import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')?.trim()

  if (!code || code.length < 2) {
    return NextResponse.json({ found: false, error: 'Missing code' }, { status: 400 })
  }

  // Prisma's table is "Institution"; the old Supabase query against
  // `institutions` matched nothing, so every school code was "not found".
  const institution = await prisma.institution.findFirst({
    where: { code: { equals: code, mode: 'insensitive' }, isActive: true },
    select: { id: true, name: true, logo: true, type: true, location: true },
  })

  if (!institution) {
    return NextResponse.json({ found: false })
  }

  return NextResponse.json({ found: true, institution })
}

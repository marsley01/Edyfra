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
    where: { code: { equals: code, mode: 'insensitive' } },
    select: { id: true, name: true, logo: true, type: true, location: true, isActive: true, status: true },
  })

  if (!institution) {
    return NextResponse.json({ found: false })
  }
  // A school that applied but isn't approved yet used to look identical to a
  // typo ("No institution found"). Say what is actually going on.
  if (!institution.isActive) {
    return NextResponse.json({ found: false, status: institution.status === 'REJECTED' ? 'rejected' : 'pending', name: institution.name })
  }

  return NextResponse.json({ found: true, institution })
}

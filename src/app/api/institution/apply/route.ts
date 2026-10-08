import { NextResponse } from 'next/server'
import { submitInstitutionSignup } from '@/app/actions/institution-signup'

// Previously this endpoint was unauthenticated, trusted a client-supplied
// `supabaseId`, wrote through the service-role client to tables that don't
// exist ('institutions', 'institution_members' — Prisma maps these to
// "Institution"/"InstitutionMember"), and would have made the caller an ACTIVE
// admin of an institution with no founder approval. It now runs the same
// validated, approval-gated flow as the signup server action: the auth account
// is created (or its password verified) server-side, and the institution and
// membership start out PENDING until a founder approves them.
const SCHOOL_TYPE_MAP: Record<string, 'PRIMARY' | 'SECONDARY' | 'COLLEGE' | 'UNIVERSITY'> = {
  HIGH_SCHOOL: 'SECONDARY',
  SECONDARY: 'SECONDARY',
  PRIMARY: 'PRIMARY',
  COLLEGE: 'COLLEGE',
  UNIVERSITY: 'UNIVERSITY',
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

  try {
    const result = await submitInstitutionSignup({
      schoolName: str(body.institutionName),
      schoolType: SCHOOL_TYPE_MAP[str(body.institutionType)] ?? 'SECONDARY',
      county: str(body.county),
      address: str(body.address) || undefined,
      website: str(body.website) || undefined,
      adminName: str(body.contactName),
      adminEmail: str(body.contactEmail),
      adminPhone: str(body.contactPhone),
      password: typeof body.password === 'string' ? body.password : '',
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error, field: result.field }, { status: 400 })
    }
    return NextResponse.json({ success: true, institutionId: result.institutionId, status: result.status })
  } catch (error) {
    console.error('Error creating institution:', error)
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
  }
}

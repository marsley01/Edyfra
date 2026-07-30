import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const institution = await prisma.institution.create({
      data: {
        supabaseId: body.supabaseId,
        name: body.institutionName,
        type: body.institutionType,
        county: body.county,
        address: body.address,
        website: body.website,
        adminName: body.contactName,
        adminEmail: body.contactEmail,
        adminPhone: body.contactPhone,
        status: 'PENDING',
      }
    })

    return NextResponse.json({ success: true, institution })
  } catch (error) {
    console.error('Error creating institution:', error)
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
  }
}

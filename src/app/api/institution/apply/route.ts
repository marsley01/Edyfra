import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = createAdminClient()

    const { data: institution, error: instErr } = await supabase
      .from('institutions')
      .insert({
        supabase_id: body.supabaseId,
        name: body.institutionName,
        type: body.institutionType,
        county: body.county,
        address: body.address,
        website: body.website,
        admin_name: body.contactName,
        admin_email: body.contactEmail,
        admin_phone: body.contactPhone,
        status: 'PENDING',
      })
      .select()
      .single()

    if (instErr) throw instErr

    await supabase
      .from('users')
      .upsert({
        id: body.supabaseId,
        email: body.contactEmail,
        name: body.contactName,
        role: 'STUDENT',
        county: body.county || 'Nairobi',
      }, { onConflict: 'id' })

    await supabase
      .from('institution_members')
      .upsert({
        institution_id: institution.id,
        user_id: body.supabaseId,
        role: 'INSTITUTION_ADMIN',
        status: 'ACTIVE',
      }, { onConflict: 'institution_id,user_id' })

    return NextResponse.json({ success: true, institution })
  } catch (error) {
    console.error('Error creating institution:', error)
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
  }
}

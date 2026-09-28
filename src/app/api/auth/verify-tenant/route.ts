import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code || code.length < 2) {
    return NextResponse.json({ found: false, error: 'Missing code' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: institution } = await supabase
    .from('institutions')
    .select('id, name, logo, type, location')
    .eq('code', code)
    .single()

  if (!institution) {
    return NextResponse.json({ found: false })
  }

  return NextResponse.json({ found: true, institution })
}

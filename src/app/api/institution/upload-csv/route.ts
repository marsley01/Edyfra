import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { parse } from 'csv-parse/sync'
import { validateUploadFile, sanitizeFileName } from '@/lib/supabase-storage'
import { validateUpload } from '@/lib/upload-filter'
import { checkRateLimit, rateLimits } from '@/lib/rate-limit/upstash'

const MAX_CSV_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
const MAX_CSV_ROWS = 5000

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Rate Limiting Check
    const rateLimitKey = `${rateLimits.upload.prefix}:${user.id}`
    const rateLimit = await checkRateLimit(rateLimitKey, rateLimits.upload.limit, rateLimits.upload.window)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many uploads, slow down", message: "Too many uploads, slow down" },
        { status: 429 }
      )
    }

    const adminSupabase = createAdminClient()
    const { data: dbUser } = await adminSupabase
      .from('users')
      .select('role, institution_members(*)')
      .eq('id', user.id)
      .single()

    const members = (dbUser as any)?.institution_members || []
    const member = members.find((m: any) => m.status === 'ACTIVE')
    if (!member && dbUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Active institution membership required' }, { status: 403 })
    }

    const allowedRoles = ['INSTITUTION_ADMIN', 'INSTITUTION_DEPUTY', 'INSTITUTION_TEACHER']
    if (member && !allowedRoles.includes(member.role) && dbUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permission to upload institution CSVs' }, { status: 403 })
    }

    const institutionId = member?.institution_id;
    if (!institutionId && dbUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Institution not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    const uploadValidation = validateUpload(file)
    if (!uploadValidation.valid) {
      return NextResponse.json(
        { error: "File type not permitted", message: "File type not permitted" },
        { status: 400 }
      )
    }

    const validation = validateUploadFile(file, {
      maxSizeBytes: MAX_CSV_SIZE_BYTES,
      allowedExtensions: ['csv'],
    })

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const timestamp = Date.now()
    const safeName = sanitizeFileName(file.name)
    const filePath = `${institutionId || 'admin'}/${timestamp}-${safeName}`
    
    let storagePath = null;
    
    const { error: uploadError } = await adminSupabase.storage
      .from('institution-csvs')
      .upload(filePath, file)
      
    if (uploadError) {
      if (uploadError.message.toLowerCase().includes('not found')) {
        await adminSupabase.storage.createBucket('institution-csvs', { public: false })
        const retry = await adminSupabase.storage.from('institution-csvs').upload(filePath, file)
        if (!retry.error) {
          storagePath = filePath
        } else {
          console.error("Retry upload failed:", retry.error)
        }
      } else {
        console.error("Upload failed:", uploadError)
      }
    } else {
      storagePath = filePath
    }

    const text = await file.text()
    const records: Record<string, string>[] = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })

    if (records.length === 0) {
      return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 })
    }

    if (records.length > MAX_CSV_ROWS) {
      return NextResponse.json({ error: `CSV exceeds maximum limit of ${MAX_CSV_ROWS} rows` }, { status: 400 })
    }

    const { data: upload, error: uErr } = await adminSupabase
      .from('csv_uploads')
      .insert({
        institution_id: institutionId!,
        file_name: file.name,
        total_rows: records.length,
        status: "COMPLETED"
      })
      .select('id')
      .single()

    if (uErr || !upload) throw uErr || new Error('Failed to create upload record')

    const resultsData = records.map(row => {
      const rawMarks = parseFloat(row.score ?? row.marks ?? '0')
      const marks = isNaN(rawMarks) ? 0 : Math.min(Math.max(rawMarks, 0), 100)
      const rawTerm = parseInt(row.term ?? '1', 10)
      const term = isNaN(rawTerm) ? 1 : Math.min(Math.max(rawTerm, 1), 3)
      const rawYear = parseInt(row.year ?? '', 10)
      const currentYear = new Date().getFullYear()
      const year = isNaN(rawYear) || rawYear < 2000 || rawYear > 2100 ? currentYear : rawYear

      const studentName = String(row.studentName || row.name || 'Unknown').trim().substring(0, 150)
      const studentEmail = row.studentEmail || row.email ? String(row.studentEmail || row.email).trim().substring(0, 150) : null
      const subject = String(row.subject || 'General').trim().substring(0, 100)
      const grade = row.grade ? String(row.grade).trim().substring(0, 10) : null

      return {
        csv_upload_id: upload.id,
        institution_id: institutionId!,
        student_name: studentName,
        student_email: studentEmail,
        subject,
        score: marks,
        marks,
        grade,
        term,
        year,
        uploaded_by_id: user.id
      }
    })

    const { data: inserted, error: iErr } = await adminSupabase
      .from('student_results')
      .insert(resultsData)
      .select('id')

    if (iErr) throw iErr

    return NextResponse.json({ 
      success: true, 
      processedRows: inserted?.length || 0,
      storagePath
    })
  } catch (error: any) {
    console.error('CSV Upload Error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to process CSV file' }, { status: 500 })
  }
}

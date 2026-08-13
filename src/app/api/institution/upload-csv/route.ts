import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { parse } from 'csv-parse/sync'
import { validateUploadFile, sanitizeFileName } from '@/lib/supabase-storage'

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

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { institutionMembers: true }
    })
    
    // Check institution membership and role authorization
    const member = dbUser?.institutionMembers?.find(m => m.status === 'ACTIVE')
    if (!member && dbUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Active institution membership required' }, { status: 403 })
    }

    const allowedRoles = ['INSTITUTION_ADMIN', 'INSTITUTION_DEPUTY', 'INSTITUTION_TEACHER']
    if (member && !allowedRoles.includes(member.role) && dbUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permission to upload institution CSVs' }, { status: 403 })
    }

    const institutionId = member?.institutionId;
    if (!institutionId && dbUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Institution not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    // Validate file size and extension
    const validation = validateUploadFile(file, {
      maxSizeBytes: MAX_CSV_SIZE_BYTES,
      allowedExtensions: ['csv'],
    })

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // 1. Upload to Supabase Storage for archival using Service Role
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const timestamp = Date.now()
    const safeName = sanitizeFileName(file.name)
    const filePath = `${institutionId || 'admin'}/${timestamp}-${safeName}`
    
    let storagePath = null;
    
    let { error: uploadError } = await supabaseAdmin.storage
      .from('institution-csvs')
      .upload(filePath, file)
      
    if (uploadError) {
      if (uploadError.message.toLowerCase().includes('not found')) {
        await supabaseAdmin.storage.createBucket('institution-csvs', { public: false })
        const retry = await supabaseAdmin.storage.from('institution-csvs').upload(filePath, file)
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

    // 2. Parse CSV
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

    // 3. Create the CsvUpload record
    const upload = await prisma.csvUpload.create({
      data: {
        institutionId: institutionId!,
        fileName: file.name,
        totalRows: records.length,
        status: "COMPLETED"
      }
    })

    // 4. Batch insert into database for performance with safe parsing
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
        csvUploadId: upload.id,
        institutionId: institutionId!,
        studentName,
        studentEmail,
        subject,
        score: marks,
        marks,
        grade,
        term,
        year,
        uploadedById: user.id
      }
    })

    const inserted = await prisma.studentResult.createMany({
      data: resultsData,
      skipDuplicates: false
    })

    return NextResponse.json({ 
      success: true, 
      processedRows: inserted.count,
      storagePath
    })
  } catch (error: any) {
    console.error('CSV Upload Error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to process CSV file' }, { status: 500 })
  }
}

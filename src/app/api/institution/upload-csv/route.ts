import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { parse } from 'csv-parse/sync'

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

    // Find institution profile. 
    // Wait, let's verify if the institution profile uses supabaseId or just the user's ID
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { institutionMembers: true }
    })
    
    // An institution admin is a member of an institution
    const member = dbUser?.institutionMembers?.find(m => m.status === 'ACTIVE')
    if (!member) {
      return NextResponse.json({ error: 'Institution not found' }, { status: 404 })
    }
    const institutionId = member.institutionId;

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    // 1. Upload to Supabase Storage for archival using Service Role
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const timestamp = Date.now()
    // Sanitize filename
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const filePath = `${institutionId}/${timestamp}-${safeName}`
    
    let storagePath = null;
    
    // Attempt upload
    let { error: uploadError } = await supabaseAdmin.storage
      .from('institution-csvs')
      .upload(filePath, file)
      
    if (uploadError) {
      // If bucket doesn't exist, create it and retry
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
      skip_empty_lines: true
    })

    if (records.length === 0) {
      return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 })
    }

    // 3. Create the CsvUpload record
    const upload = await prisma.csvUpload.create({
      data: {
        institutionId: institutionId,
        fileName: file.name,
        totalRows: records.length,
        status: "COMPLETED"
      }
    })

    // 4. Batch insert into database for performance
    const resultsData = records.map(row => ({
      csvUploadId: upload.id,
      institutionId: institutionId,
      studentName: row.studentName || row.name || 'Unknown',
      studentEmail: row.studentEmail || row.email || null,
      subject: row.subject || 'General',
      score: parseFloat(row.score) || 0,
      marks: parseFloat(row.score) || parseFloat(row.marks) || 0,
      grade: row.grade || null,
      term: parseInt(row.term) || 1,
      year: parseInt(row.year) || new Date().getFullYear(),
      uploadedById: user.id
    }))

    // Use createMany to insert all rows in one query
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

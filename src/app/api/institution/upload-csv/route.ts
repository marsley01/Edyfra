import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
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

    // Find institution profile
    const profile = await prisma.institution.findUnique({
      where: { supabaseId: user.id }
    })
    
    if (!profile) return NextResponse.json({ error: 'Institution not found' }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    const text = await file.text()
    const records: Record<string, string>[] = parse(text, {
      columns: true,
      skip_empty_lines: true
    })

    // Create the CsvUpload record
    const upload = await prisma.csvUpload.create({
      data: {
        institutionId: profile.id,
        fileName: file.name,
        totalRows: records.length,
      }
    })

    let processedCount = 0

    // Process each row
    for (const row of records) {
      await prisma.studentResult.create({
        data: {
          csvUploadId: upload.id,
          institutionId: profile.id,
          studentName: row.studentName,
          studentEmail: row.studentEmail,
          subject: row.subject,
          score: parseFloat(row.score),
          marks: parseFloat(row.score) || 0,
          grade: row.grade || null,
          term: parseInt(row.term) || 1,
          year: parseInt(row.year) || new Date().getFullYear(),
        }
      })
      processedCount++
    }

    return NextResponse.json({ success: true, processedRows: processedCount })
  } catch (error) {
    console.error('CSV Upload Error:', error)
    return NextResponse.json({ error: 'Failed to process CSV file' }, { status: 500 })
  }
}

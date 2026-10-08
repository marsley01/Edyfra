import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { parse } from 'csv-parse/sync'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { importResultRows, type ImportRow } from '@/app/actions/_institution-results-import'
import { logInstitutionActivity } from '@/app/actions/_institution-access'
import { getActiveInstitutionMembership } from '@/app/actions/institution-guard'
import { validateUploadFile, sanitizeFileName } from '@/lib/supabase-storage'
import { validateUpload } from '@/lib/upload-filter'
import { checkRateLimit, rateLimits } from '@/lib/rate-limit/upstash'

const MAX_CSV_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
const MAX_CSV_ROWS = 5000
const ALLOWED_ROLES = ['INSTITUTION_ADMIN', 'INSTITUTION_DEPUTY', 'INSTITUTION_TEACHER']

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
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

    // Resolve the caller's institution from the database (active membership
    // of an active institution). The old code queried non-existent snake_case
    // tables through the service-role client, so every upload failed, and a
    // platform ADMIN without a membership fell through with an undefined
    // institution id.
    const membership = await getActiveInstitutionMembership()
    if (!membership) {
      return NextResponse.json({ error: 'Active institution membership required' }, { status: 403 })
    }
    if (!ALLOWED_ROLES.includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permission to upload institution CSVs' }, { status: 403 })
    }
    const institutionId = membership.institution.id

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

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

    const text = await file.text()
    let records: Record<string, string>[]
    try {
      records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Malformed CSV'
      return NextResponse.json({ error: `Could not read the CSV: ${message}` }, { status: 400 })
    }

    if (records.length === 0) {
      return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 })
    }

    if (records.length > MAX_CSV_ROWS) {
      return NextResponse.json({ error: `CSV exceeds maximum limit of ${MAX_CSV_ROWS} rows` }, { status: 400 })
    }

    const columns = Object.keys(records[0])
    const hasName = columns.includes('studentName') || columns.includes('name')
    const hasScore = columns.includes('score') || columns.includes('marks')
    if (!hasName || !columns.includes('subject') || !hasScore) {
      return NextResponse.json(
        { error: 'CSV must include studentName, subject and score columns' },
        { status: 400 }
      )
    }

    const currentYear = new Date().getFullYear()
    let skippedRows = 0
    // Rows are grouped by (term, year) because each group is imported through
    // the shared idempotent importer (re-uploading a file updates rows rather
    // than duplicating them, and results are linked to enrolled students).
    const groups = new Map<string, { term: number; year: number; rows: ImportRow[] }>()
    for (const row of records) {
      const studentName = String(row.studentName || row.name || '').trim().substring(0, 150)
      const subject = String(row.subject || '').trim().substring(0, 100)
      const rawMarks = parseFloat(row.score ?? row.marks ?? '')
      // Reject rows we can't attribute or score instead of inserting
      // "Unknown"/"General"/0 placeholder results.
      if (!studentName || !subject || isNaN(rawMarks) || rawMarks < 0 || rawMarks > 100) {
        skippedRows++
        continue
      }
      const rawTerm = parseInt(row.term ?? '1', 10)
      const term = isNaN(rawTerm) ? 1 : Math.min(Math.max(rawTerm, 1), 3)
      const rawYear = parseInt(row.year ?? '', 10)
      const year = isNaN(rawYear) || rawYear < 2000 || rawYear > 2100 ? currentYear : rawYear
      const rawEmail = row.studentEmail || row.email
      const studentEmail = rawEmail ? String(rawEmail).trim().toLowerCase().substring(0, 150) : null
      const grade = row.grade ? String(row.grade).trim().substring(0, 10) : null
      const admission = row.admissionNumber || row.admission_number || row.adm || row.admNo
      const form = row.form || row.class || row.stream

      const key = `${year}-${term}`
      const group = groups.get(key) ?? { term, year, rows: [] }
      group.rows.push({
        studentName,
        studentEmail,
        subject,
        marks: rawMarks,
        grade,
        admissionNumber: admission ? String(admission).trim().substring(0, 60) : null,
        form: form ? String(form).trim().substring(0, 40) : null,
      })
      groups.set(key, group)
    }

    if (groups.size === 0) {
      return NextResponse.json(
        { error: `No valid rows found (${skippedRows} rows were missing a name, subject or a 0-100 score)` },
        { status: 400 }
      )
    }

    // Archive the original file (best-effort) only once it has validated.
    const adminSupabase = createAdminClient()
    const timestamp = Date.now()
    const safeName = sanitizeFileName(file.name)
    const filePath = `${institutionId}/${timestamp}-${safeName}`

    let storagePath: string | null = null

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

    const upload = await prisma.csvUpload.create({
      data: {
        institutionId,
        fileName: file.name.substring(0, 200),
        totalRows: records.length,
        status: 'PROCESSING',
      },
      select: { id: true },
    })

    let inserted = 0
    let updated = 0
    let unmatched = 0
    const unmatchedNames: string[] = []
    try {
      for (const g of groups.values()) {
        const out = await importResultRows({
          institutionId,
          uploaderId: membership.member.userId,
          term: g.term,
          year: g.year,
          rows: g.rows,
          csvUploadId: upload.id,
        })
        inserted += out.inserted
        updated += out.updated
        unmatched += out.skipped
        unmatchedNames.push(...out.unmatchedNames.slice(0, 10 - unmatchedNames.length))
      }
      await prisma.csvUpload.update({ where: { id: upload.id }, data: { status: 'COMPLETED' } })
    } catch (err) {
      console.error('CSV import failed:', err)
      await prisma.csvUpload.update({ where: { id: upload.id }, data: { status: 'FAILED' } }).catch(() => {})
      return NextResponse.json({ error: 'Could not save the results. Please try again.' }, { status: 500 })
    }

    if (inserted + updated > 0) {
      await logInstitutionActivity(institutionId, {
        type: 'RESULTS_UPLOADED',
        actorUserId: membership.member.userId,
        title: 'Results uploaded (CSV)',
        body: `${inserted} new, ${updated} updated, ${unmatched} unmatched rows from ${file.name.substring(0, 80)}.`,
      })
      revalidatePath('/institution/dashboard', 'layout')
    }
    const processedRows = inserted + updated
    skippedRows += unmatched

    return NextResponse.json({
      success: true,
      processedRows,
      inserted,
      updated,
      skippedRows,
      unmatchedNames,
      storagePath
    })
  } catch (error) {
    console.error('CSV Upload Error:', error)
    return NextResponse.json({ error: 'Failed to process CSV file' }, { status: 500 })
  }
}

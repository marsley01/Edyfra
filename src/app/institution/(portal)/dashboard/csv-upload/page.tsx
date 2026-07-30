'use client'

import { useState } from 'react'

export default function CsvUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setUploading(true)
    setMessage('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/institution/upload-csv', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (res.ok) {
        setMessage(`Success! Processed ${data.processedRows} rows.`)
        setFile(null)
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch {
      setMessage('An error occurred during upload.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Data Import</p>
        <h1 className="text-2xl font-black text-gray-900">Upload Student Results</h1>
        <p className="text-sm text-gray-500">Upload CSV files containing student performance data.</p>
      </header>

      <div className="max-w-xl">
        <form onSubmit={handleUpload} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-10 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mb-4"
            />
            <p className="text-xs text-gray-500">
              Make sure your CSV has the following columns:<br />
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono">
                studentName, studentEmail, subject, score, grade, term, year
              </code>
            </p>
          </div>

          <button
            type="submit"
            disabled={!file || uploading}
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {uploading ? 'Processing...' : 'Upload CSV'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 rounded-lg p-4 text-sm font-bold ${
            message.startsWith('Success')
              ? 'bg-emerald-50 text-emerald-800'
              : 'bg-red-50 text-red-800'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}

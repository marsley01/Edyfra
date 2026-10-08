'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { emailTypoMessage } from '@/lib/institution-email'

export default function InstitutionApply() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    institutionName: '',
    institutionType: 'HIGH_SCHOOL',
    county: '',
    address: '',
    website: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // The auth account is created server-side together with the application
    // (previously a client-side signUp left orphaned accounts whenever the
    // API call failed, and the API trusted a client-supplied user id).
    try {
      const res = await fetch('/api/institution/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        // Only ever render a plain string: a stringified error object once
        // reached this box as "{}".
        const message = typeof data?.error === 'string' && data.error.trim() ? data.error : null
        setError(message ?? 'Failed to submit application. Please try again or contact support.')
        // Send the applicant back to the step holding the offending field.
        if (data?.field === 'adminName' || data?.field === 'adminPhone') setStep(2)
        else if (data?.field === 'schoolName' || data?.field === 'county' || data?.field === 'address' || data?.field === 'website') setStep(1)
        return
      }

      // Success: the pending page shows review status (or sends the user to
      // sign in first if their email still needs confirming).
      router.push('/institution/pending')
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-card p-8 rounded-xl shadow-xl border">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Institution Application</h1>
          <p className="text-muted-foreground mt-2">Partner with Edyfra to elevate your students' academic performance.</p>
        </div>

        <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); setStep(step + 1) }} className="space-y-6">
          {error && <div className="p-3 text-red-500 bg-red-100 rounded-md text-sm">{error}</div>}
          
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-xl font-semibold border-b pb-2">Step 1: Institution Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Institution Name</label>
                  <input required name="institutionName" value={formData.institutionName} onChange={handleChange} className="w-full p-2 border rounded-md bg-background" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Institution Type</label>
                  <select name="institutionType" value={formData.institutionType} onChange={handleChange} className="w-full p-2 border rounded-md bg-background">
                    <option value="HIGH_SCHOOL">High School</option>
                    <option value="UNIVERSITY">University</option>
                    <option value="COLLEGE">College</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">County</label>
                  <input required name="county" value={formData.county} onChange={handleChange} className="w-full p-2 border rounded-md bg-background" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address / Location</label>
                  <input required name="address" value={formData.address} onChange={handleChange} className="w-full p-2 border rounded-md bg-background" />
                </div>
              </div>
              <button type="submit" className="w-full mt-4 py-2 bg-primary text-primary-foreground rounded-md">Next: Contact Info</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-xl font-semibold border-b pb-2">Step 2: Contact Person</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <input required name="contactName" value={formData.contactName} onChange={handleChange} className="w-full p-2 border rounded-md bg-background" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number</label>
                  <input required name="contactPhone" value={formData.contactPhone} onChange={handleChange} className="w-full p-2 border rounded-md bg-background" />
                </div>
              </div>
              <div className="flex gap-4 mt-4">
                <button type="button" onClick={() => setStep(1)} className="w-1/3 py-2 border rounded-md">Back</button>
                <button type="submit" className="w-2/3 py-2 bg-primary text-primary-foreground rounded-md">Next: Account Setup</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-xl font-semibold border-b pb-2">Step 3: Account Setup</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Administrator Email</label>
                  <input required type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} className="w-full p-2 border rounded-md bg-background" />
                  {emailTypoMessage(formData.contactEmail) ? (
                    <p className="text-xs text-amber-600 mt-1">{emailTypoMessage(formData.contactEmail)}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">This will be your login email.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Password</label>
                  <input required minLength={8} type="password" name="password" value={formData.password} onChange={handleChange} className="w-full p-2 border rounded-md bg-background" />
                </div>
              </div>
              <div className="flex gap-4 mt-4">
                <button type="button" onClick={() => setStep(2)} disabled={loading} className="w-1/3 py-2 border rounded-md disabled:opacity-50">Back</button>
                <button type="submit" disabled={loading} className="w-2/3 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50">
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const NAV = [
  '/institution/dashboard',
  '/institution/dashboard/students',
  '/institution/dashboard/teachers',
  '/institution/dashboard/results',
  '/institution/dashboard/coaching',
  '/institution/dashboard/reports',
  '/institution/dashboard/csv-upload',
  '/institution/dashboard/settings',
]

export function DashboardPrefetcher() {
  const router = useRouter()

  useEffect(() => {
    const prefetchAll = () => NAV.forEach((href) => router.prefetch(href))
    // Safari/iOS has no requestIdleCallback; calling it unguarded threw a
    // ReferenceError and crashed the whole institution portal there.
    if (typeof window.requestIdleCallback === 'function') {
      const idle = window.requestIdleCallback(prefetchAll)
      return () => window.cancelIdleCallback(idle)
    }
    const t = setTimeout(prefetchAll, 1500)
    return () => clearTimeout(t)
  }, [router])

  return null
}

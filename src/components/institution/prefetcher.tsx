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
    const idle = requestIdleCallback(() => {
      NAV.forEach((href) => router.prefetch(href))
    })
    return () => cancelIdleCallback(idle)
  }, [router])

  return null
}

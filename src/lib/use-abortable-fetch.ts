'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

type UseAbortableFetchResult<T> = {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAbortableFetch<T = unknown>(
  url: string | null,
  options?: RequestInit,
): UseAbortableFetchResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  const fetchData = useCallback(() => {
    if (!url) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    fetch(url, { ...options, signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Request failed (${res.status})`)
        }
        return res.json() as Promise<T>
      })
      .then((json) => {
        if (mountedRef.current) {
          setData(json)
          setLoading(false)
        }
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return
        if (mountedRef.current) {
          setError(err.message || 'Something went wrong')
          setLoading(false)
        }
      })
  }, [url, options])

  useEffect(() => {
    mountedRef.current = true
    fetchData()
    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
    }
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

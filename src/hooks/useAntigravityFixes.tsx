import React, { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button";

// 1. Antigravity-Safe Data Loading Hook
export function useSafeUserData() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);  
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel any ongoing requests when component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const loadUserData = async () => {
    try {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      // Only run in browser environment
      if (typeof window === 'undefined') {
        return;
      }

      const response = await fetch('/api/user-data', {
        signal: abortControllerRef.current.signal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load user data');
      }

      const data = await response.json();
      setUserData(data.data);
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('User data loading error:', err);
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-reload on mount and retry
  useEffect(() => {
    loadUserData();
  }, [retryCount]);

  return { userData, loading, error, loadUserData, retryCount, setRetryCount };
}

// 2. Antigravity-Safe Supabase Client
export function createAntigravitySafeClient() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const { createBrowserClient } = require('@supabase/ssr');
    
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    return null;
  }
}

// 3. Session Counter with Error Handling
export function useSessionCounter(userId: string) {
  const [sessionCount, setSessionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;

    const fetchSessionCount = async () => {
      try {
        setLoading(true);
        
        const supabase = createAntigravitySafeClient();
        if (!supabase) return;

        const { count, error } = await supabase
          .from("Session")
          .select("*", { count: "exact", head: true })
          .or(`studentId.eq.${userId},partnerId.eq.${userId}`);

        if (error) throw error;
        
        setSessionCount(count || 0);
      } catch (error) {
        console.error('Session count error:', error);
        setSessionCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionCount();
  }, [userId]);

  return { sessionCount, loading };
}

// 4. Safe Storage Hook
export function useSafeStorage(key: string, defaultValue: any) {
  const [value, setValue] = useState(defaultValue);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          setValue(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Storage access error:', error);
      }
    }
  }, [key]);

  const setStoredValue = (newValue: any) => {
    try {
      setValue(newValue);
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(newValue));
      }
    } catch (error) {
      console.error('Storage error:', error);
    }
  };

  return [value, setStoredValue, mounted];
}

// 5. Dashboard Loading Component
export function DashboardLoadingState() {
  return (
    <div className="p-4 sm:p-6 md:p-12 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 pb-8 md:pb-12 border-b border-border">
        <div className="space-y-3 md:space-y-4">
          <div className="h-12 sm:h-16 bg-secondary rounded animate-pulse"></div>
          <div className="h-4 sm:h-6 bg-secondary rounded animate-pulse w-3/4"></div>
        </div>
        <div className="h-12 sm:h-16 bg-secondary rounded animate-pulse w-32"></div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6 sm:p-8 bg-secondary rounded-[2rem] md:rounded-[2.5rem] border border-border/50 space-y-4 sm:space-y-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-secondary rounded-xl animate-pulse"></div>
            <div className="h-8 bg-secondary rounded animate-pulse"></div>
            <div className="h-12 bg-secondary rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 6. Error Display Component
export function DashboardError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="p-4 sm:p-6 md:p-12 max-w-7xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-red-500">
          Dashboard Error
        </h2>
        <p className="text-muted-foreground">
          {error}
        </p>
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
'use client'

import { createContext, useContext, ReactNode } from 'react'

export type UserData = {
  id: string
  email: string
  name: string
  username?: string | null
  role: string
  points: number
  tier: string
  streakDays: number
  avatar?: string | null
  referralCode?: string | null
  plan?: string
  subscriptionTier?: string | null
  educationLevel?: string | null
  formYear?: number | null
  county?: string
  createdAt: string
  lastActiveAt?: string | null
  banned?: boolean
  suspended?: boolean
}

const UserDataContext = createContext<UserData | null>(null)

export function UserDataProvider({ value, children }: { value: UserData | null; children: ReactNode }) {
  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  )
}

export function useUserDataContext() {
  return useContext(UserDataContext)
}

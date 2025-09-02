"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useProject } from '@/contexts/ProjectContext'
import { launchConfetti } from '@/lib/engagement/confetti'
import { useToast } from '@/hooks/use-toast'

type AchievementKey =
  | 'items_1'
  | 'items_10'
  | 'items_25'
  | 'items_50'
  | 'photos_10'
  | 'photos_50'
  | 'photos_100'
  | 'week_goal_completed'

interface RecentlyUnlocked {
  key: AchievementKey
  label: string
}

interface AchievementsState {
  unlocked: Set<AchievementKey>
  streak: number
  lastActionDate: string | null
  weeklyGoal: number
  weekStartISO: string // Monday of current week
  weeklyProgress: number
  recentlyUnlocked: RecentlyUnlocked | null
}

interface AchievementsContextType {
  state: AchievementsState
  recordItemAdded: () => Promise<void>
  recordPhotoAdded: (count?: number) => Promise<void>
  setWeeklyGoal: (goal: number) => void
  clearRecentlyUnlocked: () => void
}

const AchievementsContext = createContext<AchievementsContextType | undefined>(undefined)

function getWeekStart(d: Date) {
  // Make Monday start
  const day = d.getDay() // 0 Sun .. 6 Sat
  const diff = (day === 0 ? -6 : 1) - day // days to Monday
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function keyFor(projectId?: string, userId?: string) {
  return `achievements:${userId || 'anon'}:${projectId || 'no-project'}`
}

export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()
  const { activeProject } = useProject()
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string | undefined>(undefined)

  const [state, setState] = useState<AchievementsState>(() => {
    const wkStart = getWeekStart(new Date()).toISOString()
    return {
      unlocked: new Set<AchievementKey>(),
      streak: 0,
      lastActionDate: null,
      weeklyGoal: 7,
      weekStartISO: wkStart,
      weeklyProgress: 0,
      recentlyUnlocked: null,
    }
  })

  // Load persisted state per user/project
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const uid = user?.id
        setUserId(uid)
        const storageKey = keyFor(activeProject?.id, uid)
        const raw = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null
        if (raw && mounted) {
          const parsed = JSON.parse(raw)
          setState((prev) => ({
            ...prev,
            unlocked: new Set(parsed.unlocked || []),
            streak: parsed.streak || 0,
            lastActionDate: parsed.lastActionDate || null,
            weeklyGoal: parsed.weeklyGoal ?? prev.weeklyGoal,
            weekStartISO: parsed.weekStartISO || prev.weekStartISO,
            weeklyProgress: parsed.weeklyProgress || 0,
            recentlyUnlocked: null,
          }))
        }
      } catch {}
    }
    load()
    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id])

  // Persist on state changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    const storageKey = keyFor(activeProject?.id, userId)
    const toSave = {
      unlocked: Array.from(state.unlocked),
      streak: state.streak,
      lastActionDate: state.lastActionDate,
      weeklyGoal: state.weeklyGoal,
      weekStartISO: state.weekStartISO,
      weeklyProgress: state.weeklyProgress,
    }
    try { localStorage.setItem(storageKey, JSON.stringify(toSave)) } catch {}
  }, [state, activeProject?.id, userId])

  const setRecentlyUnlocked = useRef((u: RecentlyUnlocked | null) => {})

  const bumpStreakAndWeekly = useCallback(() => {
    setState((prev) => {
      const todayStr = new Date().toISOString().slice(0, 10)
      const lastStr = prev.lastActionDate?.slice(0, 10)

      let newStreak = prev.streak
      if (lastStr !== todayStr) {
        // Simple daily participation streak
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yStr = yesterday.toISOString().slice(0, 10)
        newStreak = lastStr === yStr ? prev.streak + 1 : 1
      }

      // weekly window
      const currentWeekStart = getWeekStart(new Date()).toISOString()
      const progress = prev.weekStartISO === currentWeekStart ? prev.weeklyProgress + 1 : 1

      return { ...prev, streak: newStreak, lastActionDate: todayStr, weekStartISO: currentWeekStart, weeklyProgress: progress }
    })
  }, [])

  const checkUnlocks = useCallback((stats: { totalItems?: number; totalPhotos?: number; weeklyComplete?: boolean }) => {
    const unlocks: RecentlyUnlocked[] = []
    const labels: Record<AchievementKey, string> = {
      items_1: 'First Item!',
      items_10: '10 Items Milestone',
      items_25: '25 Items Milestone',
      items_50: '50 Items Milestone',
      photos_10: '10 Photos!',
      photos_50: '50 Photos!',
      photos_100: '100 Photos!',
      week_goal_completed: 'Weekly Goal Completed',
    }

    setState((prev) => {
      const next = new Set(prev.unlocked)
      const add = (k: AchievementKey) => { if (!next.has(k)) { next.add(k); unlocks.push({ key: k, label: labels[k] }) } }

      const t = stats.totalItems ?? 0
      if (t >= 1) add('items_1')
      if (t >= 10) add('items_10')
      if (t >= 25) add('items_25')
      if (t >= 50) add('items_50')

      const p = stats.totalPhotos ?? 0
      if (p >= 10) add('photos_10')
      if (p >= 50) add('photos_50')
      if (p >= 100) add('photos_100')

      if (stats.weeklyComplete) add('week_goal_completed')

      if (unlocks.length > 0) {
        // use first; queue more later if needed
        const first = unlocks[0]
        // toast + confetti
        toast({ title: '🎉 Achievement Unlocked', description: first.label })
        launchConfetti()
        return { ...prev, unlocked: next, recentlyUnlocked: first }
      }
      return { ...prev, unlocked: next }
    })
  }, [toast])

  const fetchStats = useCallback(async (): Promise<{ totalItems: number; totalPhotos: number }> => {
    if (!activeProject) return { totalItems: 0, totalPhotos: 0 }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return { totalItems: 0, totalPhotos: 0 }
      const res = await fetch(`/api/projects/${activeProject.id}/stats`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (!res.ok) return { totalItems: 0, totalPhotos: 0 }
      const json = await res.json()
      // photos total approximation not returned by stats API; derive at 0 for now
      return { totalItems: json.totalItems || 0, totalPhotos: 0 }
    } catch {
      return { totalItems: 0, totalPhotos: 0 }
    }
  }, [activeProject, supabase])

  const recordItemAdded = useCallback(async () => {
    bumpStreakAndWeekly()
    const stats = await fetchStats()
    checkUnlocks({ totalItems: stats.totalItems, weeklyComplete: false })
  }, [bumpStreakAndWeekly, fetchStats, checkUnlocks])

  const recordPhotoAdded = useCallback(async (count = 1) => {
    bumpStreakAndWeekly()
    // We don't have a photos count API; unlock based on local increments for now
    setState((prev) => {
      // Temporary: infer via unlocked milestones; not precise across sessions
      // We still deliver a small toast for photo activity
      return prev
    })
    // Mild celebration for first few photos
    toast({ title: '📷 Photo Added', description: `${count} photo${count > 1 ? 's' : ''} uploaded` })
  }, [bumpStreakAndWeekly, toast])

  const setWeeklyGoal = useCallback((goal: number) => {
    setState((prev) => ({ ...prev, weeklyGoal: Math.max(1, Math.min(50, Math.round(goal))) }))
  }, [])

  const clearRecentlyUnlocked = useCallback(() => setState((prev) => ({ ...prev, recentlyUnlocked: null })), [])

  const value = useMemo<AchievementsContextType>(() => ({ state, recordItemAdded, recordPhotoAdded, setWeeklyGoal, clearRecentlyUnlocked }), [state, recordItemAdded, recordPhotoAdded, setWeeklyGoal, clearRecentlyUnlocked])

  return (
    <AchievementsContext.Provider value={value}>
      {children}
    </AchievementsContext.Provider>
  )
}

export function useAchievements() {
  const ctx = useContext(AchievementsContext)
  if (!ctx) throw new Error('useAchievements must be used within AchievementsProvider')
  return ctx
}

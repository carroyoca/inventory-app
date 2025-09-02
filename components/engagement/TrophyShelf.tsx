"use client"

import { useMemo } from 'react'
import { useAchievements } from '@/contexts/AchievementsContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const BADGE_LABELS: Record<string, string> = {
  items_1: 'First Item',
  items_10: '10 Items',
  items_25: '25 Items',
  items_50: '50 Items',
  photos_10: '10 Photos',
  photos_50: '50 Photos',
  photos_100: '100 Photos',
  week_goal_completed: 'Weekly Goal',
}

export function TrophyShelf() {
  const { state } = useAchievements()
  const unlocked = useMemo(() => Array.from(state.unlocked), [state.unlocked])

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">Trophies</CardTitle>
      </CardHeader>
      <CardContent>
        {unlocked.length === 0 ? (
          <div className="text-gray-600 text-sm">Start adding items and photos to unlock trophies.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {unlocked.map(k => (
              <Badge key={k} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                {BADGE_LABELS[k] || k}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}


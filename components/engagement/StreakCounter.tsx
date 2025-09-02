"use client"

import { Flame } from 'lucide-react'
import { useAchievements } from '@/contexts/AchievementsContext'
import { Card, CardContent } from '@/components/ui/card'

export function StreakCounter() {
  const { state } = useAchievements()
  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardContent className="p-5 flex items-center gap-3">
        <div className="p-3 bg-orange-100 rounded-xl">
          <Flame className="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <div className="text-sm text-gray-600">Streak</div>
          <div className="text-xl font-bold text-gray-900">{state.streak} day{state.streak === 1 ? '' : 's'}</div>
        </div>
      </CardContent>
    </Card>
  )
}


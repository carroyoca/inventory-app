"use client"

import { useMemo } from 'react'
import { useAchievements } from '@/contexts/AchievementsContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function WeeklyGoal() {
  const { state, setWeeklyGoal } = useAchievements()
  const pct = useMemo(() => {
    const p = Math.min(1, state.weeklyGoal ? state.weeklyProgress / state.weeklyGoal : 0)
    return Math.max(0, p)
  }, [state.weeklyProgress, state.weeklyGoal])

  const size = 100
  const stroke = 10
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = c * pct

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardContent className="p-5 flex items-center gap-5">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={r} stroke="#E5E7EB" strokeWidth={stroke} fill="none" />
          <circle
            cx={size/2}
            cy={size/2}
            r={r}
            stroke="#6366F1"
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            style={{
              strokeDasharray: `${dash} ${c}`,
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%',
              transition: 'stroke-dasharray 300ms ease',
            }}
          />
          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-gray-900 text-lg">
            {Math.round(pct * 100)}%
          </text>
        </svg>
        <div className="flex-1">
          <div className="text-sm text-gray-600">Meta semanal</div>
          <div className="text-xl font-bold text-gray-900">{state.weeklyProgress} / {state.weeklyGoal}</div>
          <div className="mt-3 flex gap-2">
            {[5, 7, 10, 14].map(v => (
              <Button key={v} size="sm" variant={state.weeklyGoal === v ? 'default' : 'outline'} onClick={() => setWeeklyGoal(v)}>
                {v}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

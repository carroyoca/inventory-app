"use client"

import { useMemo } from 'react'
import { useAchievements } from '@/contexts/AchievementsContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useProject } from '@/contexts/ProjectContext'

const BADGE_LABELS: Record<string, string> = {
  items_1: 'Primer ítem',
  items_10: '10 ítems',
  items_25: '25 ítems',
  items_50: '50 ítems',
  photos_10: '10 fotos',
  photos_50: '50 fotos',
  photos_100: '100 fotos',
  week_goal_completed: 'Meta semanal',
}

export function TrophyShelf() {
  const { state, resetAchievements } = useAchievements()
  const { activeProject } = useProject()
  const unlocked = useMemo(() => Array.from(state.unlocked), [state.unlocked])

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Trofeos</CardTitle>
          {activeProject?.name === 'Calle don Juan 20' && (
            <Button size="sm" variant="outline" onClick={resetAchievements}>
              Restablecer logros
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {unlocked.length === 0 ? (
          <div className="text-gray-600 text-sm">Comienza a añadir ítems y fotos para desbloquear trofeos.</div>
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

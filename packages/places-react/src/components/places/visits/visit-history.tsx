import { Inline, Stack } from '@hominem/ui'
import { Button } from '@hominem/ui/button'
import { List } from '@hominem/ui/list'
import { Star, Trash2 } from 'lucide-react'

import { usePlaceVisits } from '../../../hooks/use-places'

interface VisitHistoryProps {
  placeId: string
  placeName: string
}

export function VisitHistory({ placeId }: VisitHistoryProps) {
  const { data: visits, isLoading } = usePlaceVisits(placeId)

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading visits...</div>
  }

  if (!visits || visits.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">No visits recorded yet.</p>
      </div>
    )
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <Stack gap="sm">
      <h3 className="font-semibold">Visit History</h3>
      <List>
        {visits.map((visit) => (
          <li key={visit.id} className="py-2 border-b border-border">
            <Inline justify="between" align="start">
              <Stack gap="xs" className="flex-1">
                <Inline gap="sm" align="center">
                  <span className="font-medium text-sm">{visit.title || 'Visit'}</span>
                  {visit.visitRating && (
                    <Inline gap="xs" align="center">
                      <Star size={12} className="fill-yellow-400 text-yellow-400" />
                      <span className="text-xs">{visit.visitRating}</span>
                    </Inline>
                  )}
                </Inline>
                <span className="text-xs text-muted-foreground">{formatDate(visit.date)}</span>
                {visit.visitNotes && <p className="text-xs text-muted-foreground">{visit.visitNotes}</p>}
              </Stack>
              <Button variant="ghost" size="icon">
                <Trash2 size={14} />
              </Button>
            </Inline>
          </li>
        ))}
      </List>
    </Stack>
  )
}

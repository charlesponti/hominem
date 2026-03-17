import React from 'react'
import { useAuthContext } from '@hominem/auth'
import { Inline } from '@hominem/ui'
import { Button } from '@hominem/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from '@hominem/ui/components/ui/drawer'
import { ListPlus } from 'lucide-react'
import { useState } from 'react'

import { usePlaceById, usePlaceByGoogleId } from '../../../hooks/use-places'

function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

interface AddToListControlProps {
  placeId: string
  children?: (props: { place: NonNullable<ReturnType<typeof usePlaceById>['data']>; onClose: () => void }) => React.ReactNode
}

export function AddToListControl({ placeId, children }: AddToListControlProps) {
  const [open, setOpen] = useState(false)
  const { isAuthenticated } = useAuthContext()
  const isUuid = isValidUUID(placeId)

  const { data: placeDetailsResult } = usePlaceById(
    isAuthenticated && isUuid ? placeId : undefined,
  )

  const { data: placeDetailsByGoogleIdResult } = usePlaceByGoogleId(
    isAuthenticated && !isUuid ? placeId : undefined,
  )

  const placeDetails = placeDetailsResult ?? null
  const placeDetailsByGoogleId = placeDetailsByGoogleIdResult ?? null

  const place = placeDetails || placeDetailsByGoogleId

  if (!(isAuthenticated && place)) {
    return null
  }

  return (
    <Inline gap="sm" wrap>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button size="sm" className="flex items-center gap-2">
            <ListPlus size={16} />
            Add to list
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          {children ? children({ place, onClose: () => setOpen(false) }) : null}
        </DrawerContent>
      </Drawer>
    </Inline>
  )
}

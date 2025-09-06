import { useState } from 'react'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import { trpc } from '~/lib/trpc/client'
import { useRevalidator } from 'react-router'

export function AddPlaceToTripModal({ tripId }: { tripId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const { data: lists } = trpc.lists.getAll.useQuery()
  const addItemMutation = trpc.trips.addItem.useMutation()
  const revalidator = useRevalidator()

  const handleAddPlace = async (itemId: string) => {
    await addItemMutation.mutateAsync({ tripId, itemId })
    revalidator.revalidate()
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Add Place</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a place to your trip</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {lists?.map((list) => (
            <div key={list.id}>
              <h3 className="text-lg font-semibold mb-2">{list.name}</h3>
              <div className="space-y-2">
                {list.places.map((place) => (
                  <div key={place.itemId} className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{place.name}</p>
                      <p className="text-sm text-gray-500">{place.description}</p>
                    </div>
                    <Button size="sm" onClick={() => handleAddPlace(place.itemId)}>
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
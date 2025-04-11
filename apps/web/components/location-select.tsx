'use client'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useLocationSearch } from '@/lib/hooks/use-location-search'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import type { GeocodeFeature } from '@hominem/utils/location'
import { Building, MapIcon } from 'lucide-react'
import * as React from 'react'

export interface GeocodeFeatureSelectProps {
  initialValue?: string
  onSelect: (location: GeocodeFeature) => void
  placeholder?: string
}

export function LocationSelect({
  initialValue,
  onSelect,
  placeholder = 'Find venues in a city or neighbourhood...',
}: GeocodeFeatureSelectProps) {
  const [open, setOpen] = React.useState(false)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const { query, setQuery, locationSearch } = useLocationSearch({
    initialValue,
  })

  const triggerButton = (
    <Button variant="outline" className="w-full justify-start">
      {query || placeholder}
    </Button>
  )

  const handleSelect = (location: GeocodeFeature) => {
    onSelect(location)
    setQuery(location.label)
    setOpen(false)
  }

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <LocationList
            locations={locationSearch.data || []}
            isLoading={locationSearch.isLoading}
            query={query}
            setQuery={setQuery}
            onSelect={handleSelect}
          />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
      <DrawerContent>
        <div className="mt-4 border-t">
          <LocationList
            locations={locationSearch.data || []}
            isLoading={locationSearch.isLoading}
            query={query}
            setQuery={setQuery}
            onSelect={handleSelect}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

interface LocationListProps {
  locations: GeocodeFeature[]
  isLoading: boolean
  query: string
  setQuery: (query: string) => void
  onSelect: (location: GeocodeFeature) => void
}

function LocationList({ locations, isLoading, query, setQuery, onSelect }: LocationListProps) {
  return (
    <Command>
      <CommandInput placeholder="Search locations..." value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No locations found.</CommandEmpty>
        <CommandGroup>
          {isLoading ? (
            <CommandItem disabled>Loading...</CommandItem>
          ) : (
            locations.map((location) => (
              <CommandItem
                key={location.coordinates.join(',')}
                value={location.label}
                onSelect={() => onSelect(location)}
              >
                <span className="flex items-center gap-2">
                  {location.layer === 'venue' ? (
                    <Building className="h-4 w-4" />
                  ) : (
                    <MapIcon className="h-4 w-4" />
                  )}
                  {location.label}
                </span>
              </CommandItem>
            ))
          )}
        </CommandGroup>
      </CommandList>
    </Command>
  )
}

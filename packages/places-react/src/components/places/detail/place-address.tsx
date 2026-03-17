import { MapPin } from 'lucide-react'

interface PlaceAddressProps {
  address: string
  name: string
  place_id: string
}

export function PlaceAddress({ address, name, place_id }: PlaceAddressProps) {
  return (
    <a
      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${place_id}`}
      target="_blank"
      rel="noreferrer"
      className="flex items-center text-primary text-sm gap-2"
    >
      <MapPin size={16} className="shrink-0" />
      <span className="line-clamp-1">{address}</span>
    </a>
  )
}

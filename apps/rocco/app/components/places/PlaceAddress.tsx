import { MapPin } from 'lucide-react'

type Props = {
  address: string
  name: string
  place_id: string
}
const PlaceAddress = ({ address, name, place_id }: Props) => {
  return (
    <a
      href={`https://www.google.com/maps/search/?api=1&query=${name}&query_place_id=${place_id}`}
      target="_blank"
      rel="noreferrer"
      className="flex items-center text-primary font-medium gap-2"
    >
      <span className="inline-block">
        <MapPin size={16} />
      </span>
      <span
        className="line-clamp-1"
        /* biome-ignore lint/security/noDangerouslySetInnerHtml: address is sanitized HTML from Google Places API */
        dangerouslySetInnerHTML={{ __html: address }}
      />
    </a>
  )
}

export default PlaceAddress

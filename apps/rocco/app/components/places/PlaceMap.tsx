import { ExternalLink, MapPin } from 'lucide-react'
import { memo } from 'react'
import { env } from '~/lib/env'
import { Button } from '@hominem/ui/button'

type Props = {
  latitude: number
  longitude: number
  name: string
  googleMapsId?: string
}

const PlaceMap = ({ latitude, longitude, name, googleMapsId }: Props) => {
  const mapUrl = `https://www.google.com/maps/embed/v1/place?key=${env.VITE_GOOGLE_API_KEY}&q=${encodeURIComponent(name)}&center=${latitude},${longitude}&zoom=15`

  const handleViewInMaps = () => {
    const url = googleMapsId
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${googleMapsId}`
      : `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="relative group">
      <div className="rounded-2xl overflow-hidden shadow-md border border-gray-300 h-[300px]">
        <iframe
          title={`Map showing ${name}`}
          src={mapUrl}
          className="w-full h-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      {/* Overlay button */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <Button
          type="button"
          onClick={handleViewInMaps}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-lg hover:shadow-xl transition-all hover:scale-105 border border-gray-300"
        >
          <MapPin size={16} className="text-indigo-600" />
          <span className="text-indigo-700 font-semibold text-sm">View in Google Maps</span>
          <ExternalLink size={14} className="text-indigo-600" />
        </Button>
      </div>
    </div>
  )
}

export default memo(PlaceMap)

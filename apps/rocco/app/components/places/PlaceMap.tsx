import { memo } from 'react'
import { env } from '~/lib/env'

type Props = {
  latitude: number
  longitude: number
  name: string
  googleMapsId?: string
}

const PlaceMap = ({ latitude, longitude, name, googleMapsId }: Props) => {
  const mapUrl = `https://www.google.com/maps/embed/v1/place?key=${env.VITE_GOOGLE_API_KEY}&q=${encodeURIComponent(name)}&center=${latitude},${longitude}&zoom=15`

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
    </div>
  )
}

export default memo(PlaceMap)

interface PlaceMapProps {
  latitude: number
  longitude: number
  name: string
  googleMapsId?: string
  googleApiKey?: string
}

export function PlaceMap({ latitude, longitude, name, googleApiKey = '' }: PlaceMapProps) {
  const mapUrl = `https://www.google.com/maps/embed/v1/place?key=${googleApiKey}&q=${encodeURIComponent(name)}&center=${latitude},${longitude}&zoom=15`

  return (
    <div className="relative group">
      <div className="overflow-hidden border border-border h-[300px]">
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

import type { Place } from 'src/lib/types'

type Props = {
  alt: string
  photos: Pick<Place, 'photos'>['photos']
}
const PlacePhotos = ({ alt, photos }: Props) => {
  if (!photos || photos.length === 0) {
    return null
  }

  return (
    <div className="carousel p-4 space-x-4 bg-slate-200 rounded-box h-64 pl-4">
      {photos.map((photoUrl) => (
        <div key={photoUrl} className="carousel-item max-w-[75%]">
          <img src={photoUrl} alt={alt} className="rounded-box object-cover" />
        </div>
      ))}
    </div>
  )
}

export default PlacePhotos

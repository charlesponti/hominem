import { Star } from 'lucide-react'

type PlaceRatingProps = {
  rating: number
  size?: 'sm' | 'md'
}

const PlaceRating = ({ rating, size = 'md' }: PlaceRatingProps) => {
  if (size === 'sm') {
    return (
      <div className="flex items-center gap-1.5">
        <Star className="text-yellow-500 fill-yellow-500" size={14} />
        <span className="text-sm font-medium text-gray-700">{rating.toFixed(1)}</span>
      </div>
    )
  }

  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xl font-bold text-gray-900">{rating}</span>
      <span className="text-sm text-gray-500">/ 5</span>
    </div>
  )
}

export default PlaceRating

const PlaceRating = ({ place }: { place: google.maps.places.PlaceResult }) => {
  if (!place.rating) {
    return null
  }

  return (
    <p className="py-[4px]">
      <span className="font-semibold">Rating:</span>{' '}
      {[...Array(Math.floor(place.rating))].map((_, _i) => (
        <span key={_} className="text-yellow-500">
          ★
        </span>
      ))}
    </p>
  )
}

export default PlaceRating

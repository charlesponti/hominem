const PlaceRating = ({ place }: { place: google.maps.places.PlaceResult }) => {
  return (
    <p className="py-[4px]">
      <span className="font-semibold">Rating:</span>{' '}
      {[...Array(Math.floor(place.rating))].map((_, i) => (
        <span key={_} className="text-yellow-500">
          ★
        </span>
      ))}
    </p>
  )
}

export default PlaceRating

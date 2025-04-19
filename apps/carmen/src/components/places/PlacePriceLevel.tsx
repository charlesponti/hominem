const PlacePriceLevel = ({ priceLevel }: { priceLevel: number }) => {
  return (
    <p className="py-0">
      <span className="font-semibold">Price Level: </span>
      {
        // Render price level as dollar signs
        priceLevel &&
          [...Array(priceLevel)].map((_, i) => (
            <span key={_} className="text-green-500 px-[4px]">
              🤑
            </span>
          ))
      }
    </p>
  )
}

export default PlacePriceLevel

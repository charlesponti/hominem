const PlacePriceLevel = ({ priceLevel }: { priceLevel: number }) => {
  return (
    <p className="py-0">
      <span className="font-semibold">Price Level: </span>
      {
        // Render price level as dollar signs
        priceLevel &&
          [...Array(priceLevel)].map((_, _i) => (
            <span key={_} className="text-foreground px-[4px]">
              🤑
            </span>
          ))
      }
    </p>
  );
};

export default PlacePriceLevel;

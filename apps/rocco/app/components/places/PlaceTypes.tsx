import PlaceType from '~/components/places/PlaceType'

const EXCLUDED_TYPES = ['establishment', 'food', 'point_of_interest', 'political']

// Emoji mapping for place types
const TYPE_EMOJIS: Record<string, string> = {
  restaurant: '🍽️',
  cafe: '☕',
  bar: '🍺',
  bakery: '🥐',
  meal_takeaway: '🥡',
  meal_delivery: '🚚',
  night_club: '🎉',
  store: '🏪',
  shopping_mall: '🛍️',
  supermarket: '🛒',
  convenience_store: '🏪',
  book_store: '📚',
  clothing_store: '👔',
  electronics_store: '💻',
  furniture_store: '🛋️',
  hardware_store: '🔧',
  home_goods_store: '🏠',
  jewelry_store: '💎',
  liquor_store: '🍷',
  pet_store: '🐾',
  shoe_store: '👟',
  museum: '🏛️',
  art_gallery: '🖼️',
  park: '🌳',
  amusement_park: '🎢',
  aquarium: '🐠',
  zoo: '🦁',
  library: '📖',
  movie_theater: '🎬',
  stadium: '🏟️',
  gym: '💪',
  spa: '💆',
  beauty_salon: '💅',
  hair_care: '💇',
  hospital: '🏥',
  pharmacy: '💊',
  doctor: '👨‍⚕️',
  dentist: '🦷',
  veterinary_care: '🐕',
  lodging: '🏨',
  church: '⛪',
  mosque: '🕌',
  synagogue: '🕍',
  hindu_temple: '🛕',
  school: '🏫',
  university: '🎓',
  airport: '✈️',
  train_station: '🚂',
  bus_station: '🚌',
  subway_station: '🚇',
  parking: '🅿️',
  gas_station: '⛽',
  car_rental: '🚗',
  atm: '🏧',
  bank: '🏦',
  post_office: '📮',
  tourist_attraction: '🗺️',
  point_of_interest: '📍',
  beach: '🏖️',
  campground: '🏕️',
  city_hall: '🏛️',
  courthouse: '⚖️',
  embassy: '🏢',
  fire_station: '🚒',
  police: '👮',
}

const PlaceTypes = ({ limit, types }: { limit?: number; types: string[] }) => {
  const filterExcludedTypes = (type: string) => !EXCLUDED_TYPES.includes(type)

  const isPointOfInterest =
    types.length === 2 && types.includes('establishment') && types.includes('point_of_interest')

  return (
    <p className="flex justify-start flex-wrap gap-2">
      {isPointOfInterest ? (
        <PlaceType emoji="📍">Point of Interest</PlaceType>
      ) : (
        types
          .slice(0, limit)
          .filter(filterExcludedTypes)
          .filter((type, _index, arr) => {
            if (type === 'store' && arr.length > 1) {
              return false
            }

            return true
          })
          .map((type) => (
            <PlaceType key={type} emoji={TYPE_EMOJIS[type]}>
              {type.replace(/_/gi, ' ')}
            </PlaceType>
          ))
      )}
    </p>
  )
}

export default PlaceTypes

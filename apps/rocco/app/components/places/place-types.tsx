import type { HTMLAttributes } from 'react';

import { cn } from '~/lib/utils';

const EXCLUDED_TYPES = ['establishment', 'food', 'point_of_interest', 'political'];

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
};

interface PlaceTypeProps extends HTMLAttributes<HTMLSpanElement> {
  emoji?: string | undefined;
}

const PlaceType = ({ children, className, emoji, ...props }: PlaceTypeProps) => {
  return (
    <span
      data-testid="place-type"
      className={cn(
        'inline-flex items-center gap-1.5',
        'px-3 py-1.5',
        'text-xs font-semibold tracking-wide',
        'bg-muted',
        'border border-border',
        'text-foreground',
        'backdrop-blur-sm',
        className,
      )}
      {...props}
    >
      {emoji && (
        <span className="text-sm leading-none select-none" role="img" aria-hidden="true">
          {emoji}
        </span>
      )}
      <span className="capitalize">{children}</span>
    </span>
  );
};

const PlaceTypes = ({ limit, types }: { limit?: number; types: string[] }) => {
  const filterExcludedTypes = (type: string) => !EXCLUDED_TYPES.includes(type);

  const isPointOfInterest =
    types.length === 2 && types.includes('establishment') && types.includes('point_of_interest');

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {isPointOfInterest ? (
        <PlaceType emoji="📍">Point of Interest</PlaceType>
      ) : (
        types
          .slice(0, limit)
          .filter(filterExcludedTypes)
          .filter((type, index, arr) => {
            void index;
            if (type === 'store' && arr.length > 1) {
              return false;
            }

            if (type.includes('_restaurant') && arr.includes('restaurant')) {
              return false;
            }

            return true;
          })
          .map((type) => (
            <PlaceType key={type} emoji={TYPE_EMOJIS[type]}>
              {type.replace(/_store/gi, '').replace(/_/gi, ' ')}
            </PlaceType>
          ))
      )}
    </div>
  );
};

export default PlaceTypes;

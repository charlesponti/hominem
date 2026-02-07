import { Star } from 'lucide-react';

import { cn } from '~/lib/utils';

type PlaceRatingProps = {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
};

const PlaceRating = ({ rating, size = 'md' }: PlaceRatingProps) => {
  return (
    <div className="flex gap-2 items-center">
      <Star size={size === 'md' ? 14 : size === 'lg' ? 18 : 12} />
      <div
        className={cn('flex gap-1', {
          'text-sm': size === 'sm',
          'text-base': size === 'md',
          'text-lg': size === 'lg',
        })}
      >
        <span className="text-black font-semibold">{rating}</span>
        <span className="text-muted-foreground">/ 5</span>
      </div>
    </div>
  );
};

export default PlaceRating;

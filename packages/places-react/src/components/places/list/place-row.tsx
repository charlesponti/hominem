import { Inline } from '@hominem/ui';
import { cn } from '@hominem/ui/lib/utils';
import { Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

export interface PlaceRowProps {
  name: string;
  href: string;
  photoUrl?: string | null;
  imageUrl?: string | null;
  meta?: ReactNode;
  subtitle?: ReactNode;
  accessory?: ReactNode;
  isSelected?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  addedBy?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

function buildImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  const url = new URL(imageUrl);
  url.searchParams.set('w', '80');
  url.searchParams.set('h', '80');
  url.searchParams.set('fit', 'cover');
  return url.toString();
}

export default function PlaceRow({
  name,
  href,
  photoUrl,
  imageUrl,
  meta,
  subtitle,
  accessory,
  isSelected = false,
  onMouseEnter,
  onMouseLeave,
  addedBy,
}: PlaceRowProps) {
  const resolvedImage = buildImageUrl(photoUrl) ?? buildImageUrl(imageUrl) ?? null;

  return (
    <li
      className={cn(
        'flex items-center gap-3 px-2 py-1 group border-b border-border/30',
        'focus-within:bg-accent focus-within:ring-2 focus-within:ring-ring focus-within:',
        {
          'bg-accent': isSelected,
        },
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      data-selected={isSelected}
    >
      <Link to={href} viewTransition className="flex-1 min-w-0 void-focus">
        <Inline gap="md">
          <div className="size-8 overflow-hidden shrink-0 border border-border flex items-center justify-center">
            {resolvedImage ? (
              <img
                src={resolvedImage}
                alt={name}
                style={{ viewTransitionName: `place-row-image-${href.split('/').pop()}` }}
                className="w-full h-full object-cover"
              />
            ) : (
              <Star className="text-muted-foreground" size={28} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <Inline justify="between">
              <p className="flex-1 text-sm text-accent-foreground truncate">{name}</p>
              {meta ?? null}
            </Inline>
            <Inline gap="sm">
              {subtitle ? (
                <p className="text-xs text-muted-foreground/60 truncate">{subtitle}</p>
              ) : null}
              {addedBy && (
                <Inline gap="xs">
                  {addedBy.name ? (
                    <span className="body-4 text-muted-foreground/60 truncate">
                      {addedBy.name.split(' ')[0]}
                    </span>
                  ) : null}
                </Inline>
              )}
            </Inline>
          </div>
        </Inline>
      </Link>

      {accessory ? <div className="ml-2 flex items-center">{accessory}</div> : null}
    </li>
  );
}

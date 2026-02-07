import { List } from 'lucide-react';
import { Link } from 'react-router';

import { buildImageUrl } from '~/lib/utils';

type ListRowProps = {
  id: string;
  name: string;
  count: number;
  imageUrl?: string | null;
  imageAlt?: string;
};

export function ListRow({ id, name, count, imageUrl, imageAlt }: ListRowProps) {
  const thumbnailUrl = buildImageUrl(imageUrl, 80, 80);

  return (
    <li className="flex items-center gap-3 p-2 group border-b border-border transition-colors">
      <Link to={`/lists/${id}`} viewTransition className="flex-1 min-w-0 focus:outline-none">
        <div className="flex items-center gap-4">
          {imageUrl !== undefined ? (
            <>
              <div className="size-8 rounded-sm overflow-hidden shrink-0 border border-border flex items-center justify-center">
                {imageUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt={imageAlt || name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    style={{ viewTransitionName: `list-image-${id}` }}
                  />
                ) : (
                  <List className="text-muted-foreground" size={28} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p
                    className="flex-1 text-sm text-accent-foreground truncate"
                    style={{ viewTransitionName: `list-title-${id}` }}
                  >
                    {name}
                  </p>
                  <span className="text-xs text-muted-foreground">{count}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p
                  className="flex-1 text-sm text-accent-foreground truncate"
                  style={{ viewTransitionName: `list-title-${id}` }}
                >
                  {name}
                </p>
                <span className="text-xs text-accent-foreground">{count}</span>
              </div>
            </div>
          )}
        </div>
      </Link>
    </li>
  );
}

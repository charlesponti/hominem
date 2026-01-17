import { Globe, Lock } from 'lucide-react';
import { cn } from '~/lib/utils';

interface ListVisibilityBadgeProps {
  isPublic: boolean;
}

export default function ListVisibilityBadge({ isPublic }: ListVisibilityBadgeProps) {
  return (
    <span
      className={cn('flex max-w-fit items-center gap-1.5 px-3 py-1 rounded-full', {
        'bg-green-100 text-green-700': isPublic,
        'bg-gray-100 text-gray-700': !isPublic,
      })}
    >
      {isPublic ? (
        <>
          <Globe size={14} />
          <span className="text-xs font-medium">Public</span>
        </>
      ) : (
        <>
          <Lock size={14} />
          <span className="text-xs font-medium">Private</span>
        </>
      )}
    </span>
  );
}

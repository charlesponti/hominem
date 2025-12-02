import { Globe, Lock } from 'lucide-react'

interface ListVisibilityBadgeProps {
  isPublic: boolean
}

export default function ListVisibilityBadge({ isPublic }: ListVisibilityBadgeProps) {
  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${
        isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
      }`}
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
    </div>
  )
}

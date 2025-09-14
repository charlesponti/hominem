interface MobileHeaderProps {
  isPlaceRoute: boolean
  isListRoute: boolean
  onToggleFullscreen: () => void
}

export function MobileHeader({ isPlaceRoute, isListRoute, onToggleFullscreen }: MobileHeaderProps) {
  const getHeaderTitle = () => {
    if (isPlaceRoute) return 'Place Details'
    if (isListRoute) return 'List'
    return 'Dashboard'
  }

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
      <h2 className="text-lg font-semibold text-gray-900">{getHeaderTitle()}</h2>
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label="Enter fullscreen"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

interface MapControlsProps {
  onToggleFullscreen: () => void
}

export function MapControls({ onToggleFullscreen }: MapControlsProps) {
  return (
    <div className="absolute top-2 right-2 z-10 flex flex-col space-y-2">
      <button
        type="button"
        onClick={onToggleFullscreen}
        className="p-3 rounded-full bg-white shadow-lg hover:bg-gray-50 transition-colors"
        aria-label="Fullscreen map"
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
  )
}

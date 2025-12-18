import { useRegisterSW } from 'virtual:pwa-register/react'

interface UpdateNotificationProps {
  onUpdate: () => void
}

export function UpdateNotification({ onUpdate }: UpdateNotificationProps) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        // Check for updates periodically (every 30 minutes)
        setInterval(
          () => {
            r.update()
          },
          30 * 60 * 1000
        )
      }
    },
    onRegisterError(error) {
      console.error('SW registration error', error)
    },
  })

  // Close the notification
  const close = () => {
    setNeedRefresh(false)
  }

  if (!needRefresh) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              Update Available
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              A new version of Rocco is available. Update now to get the latest features.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => updateServiceWorker(true)}
                className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
              >
                Update Now
              </button>
              <button
                type="button"
                onClick={close}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

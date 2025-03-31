import React from 'react'
import './loading.css' // Import CSS for the glimmer effect

const Loading = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-gray-300 border-solid" />
      <p className="mt-4 text-gray-600 text-sm glimmer">Loading...</p>
    </div>
  )
}

export default Loading

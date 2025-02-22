'use client'

import React from 'react'
import { useEffect, useState } from 'react'

const LoadingPage = () => {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0
        return Math.min(prev + Math.random() * 10, 100)
      })
    }, 200)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background gradient blur */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-50">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-gradient-to-r from-purple-500 to-blue-500 blur-3xl animate-spin-slow"
            style={{ animationDuration: '15s' }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Main loading circle */}
        <div className="relative w-32 h-32">
          {/* Outer rotating gradient ring */}
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 animate-spin-slow"
            style={{ clipPath: 'inset(2px round 100px)' }}
          />

          {/* Inner static circle with centered content */}
          <div className="absolute inset-[3px] rounded-full bg-black flex items-center justify-center">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 text-transparent bg-clip-text">
              {Math.round(progress)}%
            </div>
          </div>
        </div>

        {/* Loading text with gradient */}
        <div className="space-y-4 text-center">
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-purple-400 to-blue-400 text-transparent bg-clip-text">
            Loading
          </h2>
          <p className="text-gray-400 text-sm max-w-sm">
            We&apos;re preparing something amazing for you
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map(() => (
          <div
            key={crypto.getRandomValues(new Uint32Array(1))[0]}
            className="absolute w-1 h-1 bg-white rounded-full opacity-20 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 5}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default LoadingPage

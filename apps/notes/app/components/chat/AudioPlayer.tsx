import {
  Download,
  Loader2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@hominem/ui/components/ui/button'
import { formatTime, useAudioPlayer } from '~/lib/hooks/use-audio-player.js'

interface AudioPlayerProps {
  src: string
  title?: string
  autoPlay?: boolean
  className?: string
  showDownload?: boolean
  onEnded?: () => void
}

export function AudioPlayer({
  src,
  title,
  autoPlay = false,
  className = '',
  showDownload = false,
  onEnded,
}: AudioPlayerProps) {
  const { state, audioRef, play, pause, stop, seek, setVolume, toggleMute, loadAudio } =
    useAudioPlayer()

  // Load audio when src changes
  useEffect(() => {
    if (src) {
      loadAudio(src)
    }
  }, [src, loadAudio])

  // Auto play if requested
  useEffect(() => {
    if (autoPlay && !state.isLoading && src) {
      play()
    }
  }, [autoPlay, state.isLoading, src, play])

  // Handle ended event
  useEffect(() => {
    if (audioRef.current) {
      const handleEnded = () => {
        onEnded?.()
      }

      audioRef.current.addEventListener('ended', handleEnded)
      return () => {
        audioRef.current?.removeEventListener('ended', handleEnded)
      }
    }
  }, [onEnded, audioRef.current])

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const time = percent * state.duration
    seek(time)
  }

  const handleSkipBack = () => {
    seek(Math.max(0, state.currentTime - 10))
  }

  const handleSkipForward = () => {
    seek(Math.min(state.duration, state.currentTime + 10))
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number.parseFloat(e.target.value))
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = src
    link.download = title || 'audio.mp3'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const progressPercent = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0

  return (
    <div className={`bg-muted rounded-lg p-4 space-y-3 ${className}`}>
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="metadata" />

      {/* Title */}
      {title && <div className="text-sm font-medium truncate">{title}</div>}

      {/* Error message */}
      {state.error && <div className="text-sm text-destructive">{state.error}</div>}

      {/* Progress bar */}
      <div className="space-y-2">
        <div
          className="w-full h-2 bg-secondary rounded-full cursor-pointer relative"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-primary rounded-full transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Progress handle */}
          <div
            className="absolute top-1/2 w-4 h-4 bg-primary rounded-full shadow-md transform -translate-y-1/2 -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        {/* Time display */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(state.currentTime)}</span>
          <span>{formatTime(state.duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Playback controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSkipBack}
            disabled={state.isLoading || !src}
            className="h-8 w-8"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={state.isPlaying ? pause : play}
            disabled={state.isLoading || !src}
            className="h-10 w-10"
          >
            {state.isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : state.isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={stop}
            disabled={state.isLoading || !src}
            className="h-8 w-8"
          >
            <Square className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleSkipForward}
            disabled={state.isLoading || !src}
            className="h-8 w-8"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Volume and additional controls */}
        <div className="flex items-center gap-2">
          {/* Volume control */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleMute} className="h-8 w-8">
              {state.isMuted || state.volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={state.isMuted ? 0 : state.volume}
              onChange={handleVolumeChange}
              className="w-16 h-1 bg-secondary rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Download button */}
          {showDownload && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              disabled={!src}
              className="h-8 w-8"
              title="Download audio"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

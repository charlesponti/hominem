

import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState, type HTMLAttributes } from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

interface AudioPlayerProps {
  src?: string;
  audioRef?: React.RefObject<HTMLAudioElement>;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  className?: string;
}

export function AudioPlayer({
  src,
  audioRef: externalRef,
  onTimeUpdate,
  onEnded,
  className,
  ...props
}: AudioPlayerProps) {
  const internalRef = useRef<HTMLAudioElement>(null);
  const audioRef = externalRef || internalRef;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef as React.RefObject<HTMLAudioElement>;
    if (!audio.current) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.current.currentTime);
      onTimeUpdate?.(audio.current.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.current.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    audio.current.addEventListener('timeupdate', handleTimeUpdate);
    audio.current.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.current.addEventListener('ended', handleEnded);

    return () => {
      audio.current?.removeEventListener('timeupdate', handleTimeUpdate);
      audio.current?.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.current?.removeEventListener('ended', handleEnded);
    };
  }, [audioRef, onTimeUpdate, onEnded]);

  const togglePlay = () => {
    const audio = audioRef as React.RefObject<HTMLAudioElement>;
    if (!audio.current) return;

    if (isPlaying) {
      audio.current.pause();
    } else {
      audio.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef as React.RefObject<HTMLAudioElement>;
    if (!audio.current) return;

    const time = parseFloat(e.target.value);
    audio.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef as React.RefObject<HTMLAudioElement>;
    if (!audio.current) return;

    const vol = parseFloat(e.target.value);
    audio.current.volume = vol;
    setVolume(vol);
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    const audio = audioRef as React.RefObject<HTMLAudioElement>;
    if (!audio.current) return;

    if (isMuted) {
      audio.current.volume = volume || 1;
      setIsMuted(false);
    } else {
      audio.current.volume = 0;
      setIsMuted(true);
    }
  };

  const skip = (seconds: number) => {
    const audio = audioRef as React.RefObject<HTMLAudioElement>;
    if (!audio.current) return;

    audio.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('flex flex-col gap-2 p-3 rounded-md border', className)} {...props}>
      {src && <audio ref={audioRef} src={src} />}

      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" onClick={() => skip(-10)}>
          <SkipBack className="size-4" />
        </Button>
        <Button type="button" variant="default" size="icon" onClick={togglePlay}>
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => skip(10)}>
          <SkipForward className="size-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-10">{formatTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1 accent-primary"
        />
        <span className="text-xs text-muted-foreground w-10">{formatTime(duration)}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="icon" onClick={toggleMute}>
          {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </Button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="w-20 h-1 accent-primary"
        />
      </div>
    </div>
  );
}

interface AudioPlayerProgressProps extends HTMLAttributes<HTMLDivElement> {
  progress: number;
}

export function AudioPlayerProgress({ progress, className, ...props }: AudioPlayerProgressProps) {
  return (
    <div className={cn('h-1 bg-muted rounded-full overflow-hidden', className)} {...props}>
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
      />
    </div>
  );
}

interface AudioPlayerPlayButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isPlaying?: boolean;
}

export function AudioPlayerPlayButton({
  isPlaying = false,
  className,
  ...props
}: AudioPlayerPlayButtonProps) {
  return (
    <Button
      type="button"
      variant="default"
      size="icon"
      className={cn('rounded-full', className)}
      {...props}
    >
      {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
    </Button>
  );
}

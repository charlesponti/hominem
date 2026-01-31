import { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  isRecording: boolean;
  stream: MediaStream | null;
  className?: string;
}

export function AudioWaveform({ isRecording, stream, className = '' }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!(isRecording && stream && canvasRef.current)) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    if (!ctx) return;

    // Set up audio context and analyser
    const winWithWebkit = window as unknown as { webkitAudioContext?: typeof AudioContext };
    const AudioContextClass = (window.AudioContext ||
      winWithWebkit.webkitAudioContext) as typeof AudioContext;
    const audioContext = new AudioContextClass();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    source.connect(analyser);
    analyserRef.current = analyser;
    dataArrayRef.current = dataArray;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation function
    const draw = () => {
      if (!isRecording) return;

      animationRef.current = requestAnimationFrame(draw);

      if (!(analyser && dataArray && ctx)) return;

      analyser.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw waveform
      const barWidth = (canvas.width / dataArray.length) * 2;
      let barHeight: number;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        const value = dataArray[i];
        if (value === undefined) continue;
        barHeight = (value / 255) * canvas.height;

        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#ef4444'); // red-500
        gradient.addColorStop(0.5, '#f97316'); // orange-500
        gradient.addColorStop(1, '#eab308'); // yellow-500

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
      audioContext.close();
    };
  }, [isRecording, stream]);

  if (!isRecording) {
    return (
      <div className={`h-16 bg-muted rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-sm text-muted-foreground">Click to start recording</div>
      </div>
    );
  }

  return (
    <div className={`h-16 bg-muted rounded-lg overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '@hominem/ui/components/ui/card'
import { Slider } from '@hominem/ui/components/ui/slider'
import { DollarSign, Music } from 'lucide-react'
import { useState } from 'react'

const calculateEarnings = (rate: number, streams: number) => {
  return rate * streams
}

const MusicStreamingCalculator = () => {
  const [streamCount, setStreamCount] = useState([100000])

  const streamingServices = [
    { name: 'Apple Music', rate: 0.008, color: 'bg-red-500' },
    { name: 'Spotify', rate: 0.004, color: 'bg-green-500' },
    { name: 'Amazon Music', rate: 0.004, color: 'bg-blue-500' },
    { name: 'YouTube Music', rate: 0.003, color: 'bg-red-600' },
    { name: 'Tidal', rate: 0.01, color: 'bg-blue-600' },
    { name: 'Deezer', rate: 0.0035, color: 'bg-purple-500' },
    { name: 'Pandora', rate: 0.0015, color: 'bg-blue-400' },
  ]

  const highestRate = Math.max(...streamingServices.map((service) => service.rate))
  const maxEarnings = calculateEarnings(highestRate, 1000000)

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-6 w-6" />
          Streaming Income Calculator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <span className="label text-sm font-medium">
              Number of Streams: {streamCount.toLocaleString()}
            </span>
            <Slider
              value={streamCount}
              onValueChange={setStreamCount}
              max={1000000}
              step={1000}
              className="w-full"
            />
          </div>

          <div className="space-y-4">
            {streamingServices.map((service) => (
              <StreamingServiceStreamingRate
                key={service.name}
                service={service}
                streamCount={streamCount}
                maxEarnings={maxEarnings}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface StreamingServiceRateProps {
  service: {
    name: string
    rate: number
    color: string
  }
  streamCount: number[]
  maxEarnings: number
}
function StreamingServiceStreamingRate({
  service,
  streamCount,
  maxEarnings,
}: StreamingServiceRateProps) {
  const earnings = calculateEarnings(service.rate, streamCount[0])
  const percentOfMax = earnings / maxEarnings

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{service.name}</span>
        <div className="flex items-center gap-1">
          <DollarSign className="h-4 w-4" />
          <span className="text-lg font-bold">{earnings.toFixed(2)}</span>
        </div>
      </div>
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${service.color} transition-all duration-300`}
          style={{
            width: `${percentOfMax * 100}%`,
          }}
        />
      </div>
    </div>
  )
}

export default MusicStreamingCalculator

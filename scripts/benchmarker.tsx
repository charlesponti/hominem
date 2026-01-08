import { Box, render, Text } from 'ink'
import { useEffect, useState } from 'react'

const ITERATIONS = 100000
const RUNS = 100

// Sample URLs to test
const testUrls = [
  'https://supabase.co/storage/v1/object/public/photos/image.jpg',
  'https://example.com/places/ChIJ123/photos/abc',
  'https://lh3.googleusercontent.com/p/abc',
  'https://maps.googleapis.com/maps/api/place/photo',
  'https://randomsite.com/image.png',
  'places/ChIJ456/photos/def',
  'lh3.googleusercontent.com/q/xyz',
  'https://places.googleapis.com/v1/places/ChIJ789/photos/ghi/media?key=abc',
]

// Original check function (deprecated - has security vulnerability)
function originalCheck(photoUrl) {
  try {
    const url = new URL(photoUrl)
    const hostname = url.hostname.toLowerCase()
    return !(hostname.endsWith('googleapis.com') || hostname.endsWith('googleusercontent.com'))
  } catch {
    // If URL parsing fails, check for path patterns
    return !(photoUrl.includes('places/') && photoUrl.includes('/photos/'))
  }
}

// New check function
function newCheck(photoUrl) {
  return !['places/', 'googleusercontent', 'googleapis.com'].some((str) => photoUrl.includes(str))
}

// Run a single benchmark
function runBenchmark(fn) {
  const start = process.hrtime.bigint()
  for (let i = 0; i < ITERATIONS; i++) {
    for (const url of testUrls) {
      fn(url)
    }
  }
  const end = process.hrtime.bigint()
  return Number(end - start)
}

function App() {
  const [results, setResults] = useState([])
  const [currentRun, setCurrentRun] = useState(0)
  const [isRunning, setIsRunning] = useState(true)

  useEffect(() => {
    const runAllBenchmarks = async () => {
      const originalResults = []
      const newResults = []

      for (let run = 0; run < RUNS; run++) {
        setCurrentRun(run + 1)

        // Run original
        const originalTime = runBenchmark(originalCheck)
        originalResults.push(originalTime)

        // Run new
        const newTime = runBenchmark(newCheck)
        newResults.push(newTime)

        // Small delay to prevent overwhelming
        await new Promise((resolve) => setTimeout(resolve, 1))
      }

      // Calculate averages
      const originalAvg = originalResults.reduce((a, b) => a + b, 0) / RUNS
      const newAvg = newResults.reduce((a, b) => a + b, 0) / RUNS
      const originalAvgPerCall = originalAvg / (ITERATIONS * testUrls.length)
      const newAvgPerCall = newAvg / (ITERATIONS * testUrls.length)

      setResults([
        {
          method: 'Original (3 includes)',
          totalAvg: originalAvg,
          perCallAvg: originalAvgPerCall,
        },
        {
          method: 'New (array.some)',
          totalAvg: newAvg,
          perCallAvg: newAvgPerCall,
        },
      ])

      setIsRunning(false)
    }

    runAllBenchmarks()
  }, [])

  if (isRunning) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">
          🔄 Running benchmark {currentRun}/{RUNS}...
        </Text>
        <Text dimColor>
          {ITERATIONS} iterations × {testUrls.length} URLs × {RUNS} runs ={' '}
          {(ITERATIONS * testUrls.length * RUNS).toLocaleString()} total calls
        </Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <Text bold color="green">
        Benchmark Complete!
      </Text>
      <Text>Results (averages over {RUNS} runs):</Text>
      <Text> </Text>
      <Box borderStyle="round" borderColor="blue" padding={1}>
        <Box flexDirection="column">
          <Text bold color="cyan">
            Method
          </Text>
          <Text>─────────────────────────────</Text>
          {results.map((result, index) => (
            <Box key={index} marginBottom={1}>
              <Text>{result.method}</Text>
            </Box>
          ))}
        </Box>
        <Box flexDirection="column" marginLeft={4}>
          <Text bold color="cyan">
            Total Avg (ns)
          </Text>
          <Text>────────────────</Text>
          {results.map((result, index) => (
            <Box key={index} marginBottom={1}>
              <Text color={index === 0 ? 'green' : 'yellow'}>
                {result.totalAvg.toLocaleString()}
              </Text>
            </Box>
          ))}
        </Box>
        <Box flexDirection="column" marginLeft={4}>
          <Text bold color="cyan">
            Per Call Avg (ns)
          </Text>
          <Text>─────────────────</Text>
          {results.map((result, index) => (
            <Box key={index} marginBottom={1}>
              <Text color={index === 0 ? 'green' : 'yellow'}>{result.perCallAvg.toFixed(2)}</Text>
            </Box>
          ))}
        </Box>
      </Box>
      <Text dimColor>
        Note: The original method is faster. Difference:{' '}
        {(results[1]?.perCallAvg - results[0]?.perCallAvg).toFixed(2)} ns per call
      </Text>
    </Box>
  )
}

render(<App />)

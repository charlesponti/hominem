import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

function formatDuration(duration) {
  if (duration >= 1000) {
    return `${(duration / 1000).toFixed(2)}s`
  }

  return `${Math.round(duration)}ms`
}

function main() {
  const reportPath = process.argv[2]
  const heading = process.argv[3] ?? '### Slowest tests'
  const limitArg = process.argv[4]
  const limit = limitArg ? Number.parseInt(limitArg, 10) : 5

  if (!reportPath) {
    throw new Error('Expected report path as the first argument')
  }

  const report = JSON.parse(readFileSync(reportPath, 'utf8'))
  const slowestTests = (report.testResults ?? [])
    .flatMap((suite) =>
      (suite.assertionResults ?? []).map((assertion) => ({
        duration: assertion.duration ?? 0,
        fullName: assertion.fullName,
        file: suite.name,
        status: assertion.status,
      })),
    )
    .filter((assertion) => assertion.status === 'passed' || assertion.status === 'failed')
    .sort((left, right) => right.duration - left.duration)
    .slice(0, limit)

  console.log(heading)
  console.log('')

  if (slowestTests.length === 0) {
    console.log('- No test timing data found')
    return
  }

  for (const test of slowestTests) {
    console.log(
      `- ${formatDuration(test.duration)} | ${test.fullName} | ${basename(test.file)}`,
    )
  }
}

main()
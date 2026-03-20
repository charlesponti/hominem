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
  const warnThresholdArg = process.argv[5]
  const failThresholdArg = process.argv[6]
  const warnThreshold = warnThresholdArg ? Number.parseInt(warnThresholdArg, 10) : null
  const failThreshold = failThresholdArg ? Number.parseInt(failThresholdArg, 10) : null

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
  const allTests = (report.testResults ?? [])
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

  if (warnThreshold !== null) {
    const warningTests = allTests.filter((test) => test.duration >= warnThreshold)
    console.log('')
    console.log(`### Threshold breaches (${formatDuration(warnThreshold)})`)
    console.log('')

    if (warningTests.length === 0) {
      console.log('- No tests exceeded the warning threshold')
    } else {
      for (const test of warningTests) {
        console.log(
          `- ${formatDuration(test.duration)} | ${test.fullName} | ${basename(test.file)}`,
        )
      }
    }
  }

  if (failThreshold !== null) {
    const failingTests = allTests.filter((test) => test.duration >= failThreshold)
    if (failingTests.length > 0) {
      process.exitCode = 1
    }
  }
}

main()
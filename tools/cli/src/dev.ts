import { main } from './cli'

process.env.NODE_ENV = process.env.NODE_ENV ?? 'development'

main(process.argv.slice(2))
  .then((exitCode) => {
    process.exitCode = exitCode
  })
  .catch((error: Error) => {
    process.stderr.write(`FATAL: ${error.message}\n`)
    process.exitCode = 10
  })

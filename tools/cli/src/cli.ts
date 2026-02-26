import { runCli } from './v2/runtime';

export async function main(argv?: string[]) {
  const result = await runCli(argv ?? process.argv.slice(2));
  return result.exitCode;
}

if (import.meta.main) {
  main()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: Error) => {
      process.stderr.write(`FATAL: ${error.message}\n`);
      process.exitCode = 10;
    });
}

// ! TODO - Implement Sentry logger
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export const log = (...args: any[]) => {
  // biome-ignore lint/suspicious/noConsoleLog: <explanation>
  console.log(...args)
}

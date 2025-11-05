/**
 * Reads a ReadableStream from a fetch response and invokes onUpdate
 * with the accumulated text as chunks arrive.
 * Returns the full concatenated string when complete.
 */
export async function streamToString(
  response: Response,
  onUpdate: (partial: string) => void
): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('Stream reader not available')
  }
  const decoder = new TextDecoder()
  let result = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    result += decoder.decode(value, { stream: true })
    onUpdate(result)
  }
  return result
}

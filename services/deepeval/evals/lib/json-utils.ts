export function parseModelJson(output: string): Record<string, unknown> {
  const stripped = output
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(stripped) as Record<string, unknown>;
}

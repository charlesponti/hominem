/**
 * Extracts keys and values from JSON text
 */
export function extractKeysAndValues(jsonText: string) {
  try {
    const data = JSON.parse(jsonText);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

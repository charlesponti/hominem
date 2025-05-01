// Helper function to remove null/undefined values from records
function removeNullUndefined<T>(data: T): T {
  if (Array.isArray(data)) {
    return data.map((item) => removeNullUndefined(item)) as T
  }

  if (typeof data === 'object' && data !== null) {
    return Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== null && value !== undefined) {
        // Recursively process nested objects
        acc[key as keyof T] = removeNullUndefined(value)
      }
      return acc
    }, {} as T)
  }

  return data
}

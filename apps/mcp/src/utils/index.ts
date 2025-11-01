// Helper function to remove null/undefined values from records
function _removeNullUndefined<T>(data: T): T {
  if (Array.isArray(data)) {
    return data.map((item) => _removeNullUndefined(item)) as T
  }

  if (typeof data === 'object' && data !== null) {
    return Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== null && value !== undefined) {
        // Recursively process nested objects
        acc[key as keyof T] = _removeNullUndefined(value)
      }
      return acc
    }, {} as T)
  }

  return data
}

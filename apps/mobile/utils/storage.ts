const memoryStorage = new Map<string, string>()

export const storage = {
  getString: (key: string) => memoryStorage.get(key),
  set: (key: string, value: string) => {
    memoryStorage.set(key, value)
  },
  delete: (key: string) => {
    memoryStorage.delete(key)
  },
}

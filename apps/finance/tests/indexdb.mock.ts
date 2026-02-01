import { vi } from 'vitest'

interface IDBRequestMock {
  result?: unknown
  onsuccess?: () => void
  onerror?: () => void
}

export const indexedDB = {
  open: vi.fn(() => ({
    onupgradeneeded: null,
    onsuccess: vi.fn(function (this: IDBRequestMock) {
      this.result = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            add: vi.fn(() => ({
              onsuccess: vi.fn(),
              onerror: vi.fn(),
            })),
            put: vi.fn(() => ({
              onsuccess: vi.fn(),
              onerror: vi.fn(),
            })),
            delete: vi.fn(() => ({
              onsuccess: vi.fn(),
              onerror: vi.fn(),
            })),
            get: vi.fn(() => ({
              onsuccess: vi.fn(function (this: IDBRequestMock) {
                this.result = null
              }),
              onerror: vi.fn(),
            })),
            getAll: vi.fn(() => ({
              onsuccess: vi.fn(function (this: IDBRequestMock) {
                this.result = []
              }),
              onerror: vi.fn(),
            })),
            index: vi.fn(() => ({
              getAll: vi.fn(() => ({
                onsuccess: vi.fn(function (this: IDBRequestMock) {
                  this.result = []
                }),
                onerror: vi.fn(),
              })),
            })),
          })),
          oncomplete: vi.fn(),
          onerror: vi.fn(),
        })),
        close: vi.fn(),
        createObjectStore: vi.fn(() => ({
          createIndex: vi.fn(),
        })),
        objectStoreNames: {
          contains: vi.fn(() => true),
        },
      }
      this.onerror = vi.fn()
      setTimeout(() => {
        if (this.onsuccess) this.onsuccess()
      }, 0)
    }),
    onerror: vi.fn(),
  })),
}

// Assign the mock to global
global.indexedDB = indexedDB as unknown as IDBFactory

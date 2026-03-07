import crypto from 'node:crypto'

export interface SeededRandom {
  next: () => number
  int: (minInclusive: number, maxInclusive: number) => number
  pick: <T>(values: readonly T[]) => T
  uuid: () => string
}

function hashSeed(seed: string): number {
  const hash = crypto.createHash('sha256').update(seed).digest()
  return hash.readUInt32BE(0)
}

export function createSeededRandom(seed: string): SeededRandom {
  let state = hashSeed(seed) || 0x9e3779b9

  const nextUint32 = (): number => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return state >>> 0
  }

  const next = (): number => {
    return nextUint32() / 0xffffffff
  }

  const int = (minInclusive: number, maxInclusive: number): number => {
    if (maxInclusive < minInclusive) {
      throw new Error('maxInclusive must be >= minInclusive')
    }
    const span = maxInclusive - minInclusive + 1
    return minInclusive + Math.floor(next() * span)
  }

  const pick = <T>(values: readonly T[]): T => {
    if (values.length === 0) {
      throw new Error('cannot pick from empty array')
    }
    return values[int(0, values.length - 1)] as T
  }

  const uuid = (): string => {
    const bytes = new Uint8Array(16)
    for (let i = 0; i < 16; i += 1) {
      bytes[i] = int(0, 255)
    }
    bytes[6] = (bytes[6]! & 0x0f) | 0x40
    bytes[8] = (bytes[8]! & 0x3f) | 0x80
    const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  return {
    next,
    int,
    pick,
    uuid,
  }
}

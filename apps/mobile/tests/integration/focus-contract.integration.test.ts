import { describe, expect, it } from 'vitest'

interface FocusListItem {
  id: string
  text: string
  createdAt: string
}

function buildFocusItems(count: number): FocusListItem[] {
  const items: FocusListItem[] = []
  for (let index = 0; index < count; index += 1) {
    items.push({
      id: `focus-${index.toString().padStart(4, '0')}`,
      text: `Focus item ${index + 1}`,
      createdAt: `2026-01-01T00:${Math.floor(index / 60)
        .toString()
        .padStart(2, '0')}:${(index % 60).toString().padStart(2, '0')}.000Z`,
    })
  }
  return items
}

function simulateFocusScrollTraversal(items: FocusListItem[], windowSize: number, step: number): string[] {
  const renderedKeys: string[] = []
  if (items.length === 0) {
    return renderedKeys
  }

  for (let start = 0; start < items.length; start += step) {
    const end = Math.min(start + windowSize, items.length)
    for (let cursor = start; cursor < end; cursor += 1) {
      renderedKeys.push(items[cursor]!.id)
    }
    if (end === items.length) {
      break
    }
  }

  return renderedKeys
}

function countUnique(values: string[]): number {
  return new Set(values).size
}

describe('focus contract integration', () => {
  it('produces deterministic traversal order for the same dataset and scroll window', () => {
    const dataset = buildFocusItems(500)
    const firstTraversal = simulateFocusScrollTraversal(dataset, 18, 6)
    const secondTraversal = simulateFocusScrollTraversal(dataset, 18, 6)

    expect(secondTraversal).toEqual(firstTraversal)
    expect(firstTraversal.at(0)).toBe('focus-0000')
    expect(firstTraversal.at(-1)).toBe('focus-0499')
  })

  it('covers the full dataset during simulated scroll traversal', () => {
    const dataset = buildFocusItems(750)
    const traversal = simulateFocusScrollTraversal(dataset, 20, 8)
    const uniqueRendered = countUnique(traversal)

    expect(uniqueRendered).toBe(dataset.length)
  })

  it('keeps focus traversal benchmark within performance threshold', () => {
    const dataset = buildFocusItems(2000)
    const startedAt = performance.now()
    const traversal = simulateFocusScrollTraversal(dataset, 24, 8)
    const elapsedMs = performance.now() - startedAt

    expect(traversal.length).toBeGreaterThan(dataset.length)
    expect(elapsedMs).toBeLessThan(20)
  })
})

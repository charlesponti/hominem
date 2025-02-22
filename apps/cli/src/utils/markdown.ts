import fs from 'node:fs/promises'
import path from 'node:path'
import type { BulletPoint } from '../types'

export async function parseMarkdownFile(filePath: string): Promise<BulletPoint[]> {
  const content = await fs.readFile(filePath, 'utf-8')
  const lines = content.split('\n').filter((line) => line.trim())
  const bullets: BulletPoint[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.startsWith('- ')) {
      const text = line.substring(2).trim()
      const bullet: BulletPoint = {
        text,
        subPoints: [],
      }

      // Look ahead for sub-points
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('  - ')) {
        i++
        const subText = lines[i].trim().substring(2)
        bullet.subPoints?.push({ text: subText })
      }

      bullets.push(bullet)
    }
  }

  return bullets
}

export async function writeBulletPointFiles(
  bullets: BulletPoint[],
  outputDir: string
): Promise<void> {
  await fs.mkdir(outputDir, { recursive: true })
  const filePath = path.join(outputDir, 'bullet.json')
  await fs.writeFile(filePath, JSON.stringify(bullets, null, 2))
}

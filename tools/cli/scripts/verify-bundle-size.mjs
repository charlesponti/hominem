import fs from 'node:fs/promises'
import path from 'node:path'
import zlib from 'node:zlib'

const filePath = path.resolve(process.cwd(), 'dist/hominem')
const maxCompressedBytes = 35 * 1024 * 1024

try {
  const binary = await fs.readFile(filePath)
  const compressed = zlib.gzipSync(binary, { level: 9 })

  if (compressed.byteLength > maxCompressedBytes) {
    console.error(
      `Bundle regression: ${compressed.byteLength} bytes > ${maxCompressedBytes} bytes (compressed limit)`
    )
    process.exit(1)
  }

  console.log(
    `Bundle size OK: compressed ${compressed.byteLength} bytes (limit ${maxCompressedBytes} bytes)`
  )
} catch (error) {
  console.error(`Failed to verify bundle size: ${error instanceof Error ? error.message : 'unknown error'}`)
  process.exit(1)
}

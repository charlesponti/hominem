import fs from 'fs'
import path from 'path'

// lightweight audit: flag raw numeric spacing values (padding, margin, gap, borderRadius)
// in StyleSheet.create blocks. Ignore fontSize, width, height as those are one-offs.

const spacingProperties = ['padding', 'margin', 'gap', 'borderRadius']

const root = path.resolve(__dirname, '../../..')
const targetDir = path.join(root, 'apps', 'mobile')
const extensions = ['.ts', '.tsx']
let violations: string[] = []

function walk(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const ent of entries) {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      walk(full)
    } else if (extensions.includes(path.extname(ent.name))) {
      scanFile(full)
    }
  }
}

function scanFile(filePath: string) {
  const text = fs.readFileSync(filePath, 'utf8')
  const lines = text.split('\n')
  let inside = false
  let braceDepth = 0

  lines.forEach((line, idx) => {
    if (!inside) {
      if (line.includes('StyleSheet.create')) {
        inside = true
        braceDepth += (line.match(/{/g) || []).length
        braceDepth -= (line.match(/}/g) || []).length
      }
    } else {
      braceDepth += (line.match(/{/g) || []).length
      braceDepth -= (line.match(/}/g) || []).length

      // only flag spacing-related properties with raw numbers
      const hasSpacingProp = spacingProperties.some((prop) => line.includes(prop))
      if (hasSpacingProp) {
        const match = line.match(/:\s*(\d+)/)
        if (match && !line.includes('t.spacing') && !line.includes('t.borderRadii')) {
          violations.push(`${filePath}:${idx + 1} raw spacing ${match[1]}`)
        }
      }

      if (braceDepth <= 0) {
        inside = false
      }
    }
  })
}


walk(targetDir)

if (violations.length) {
  console.log('⚠️  raw spacing values detected:')
  violations.forEach((v) => console.log('  ' + v))
  process.exitCode = 1
} else {
  console.log('✅  all spacing values use design tokens')
}

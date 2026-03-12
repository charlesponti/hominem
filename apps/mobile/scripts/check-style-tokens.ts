import fs from 'fs'
import path from 'path'

// lightweight audit: flag raw numeric spacing values in StyleSheet.create blocks.
// Focus on actual layout spacing props, not radii or dimensions.

const spacingProperties = [
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'paddingHorizontal',
  'paddingVertical',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'marginHorizontal',
  'marginVertical',
  'gap',
  'rowGap',
  'columnGap',
]

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

      if (line.includes('token-audit-ignore')) {
        return
      }

      const trimmed = line.trim()

      for (const prop of spacingProperties) {
        const match = trimmed.match(new RegExp(`^${prop}:\\s*(-?\\d+)`))
        if (!match) {
          continue
        }

        const value = Number.parseInt(match[1], 10)
        if (value === 0 || value === 1) {
          break
        }

        if (!line.includes('t.spacing')) {
          violations.push(`${filePath}:${idx + 1} raw spacing ${match[1]}`)
        }

        break
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

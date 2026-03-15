import { execSync } from 'child_process'
import { existsSync } from 'fs'

const sourceIcon = 'assets/icon.png'

if (!existsSync(sourceIcon)) {
  console.error(`❌ Source icon not found: ${sourceIcon}`)
  process.exit(1)
}

const sizes = [
  { name: '20', scales: [1, 2, 3] },
  { name: '29', scales: [1, 2, 3] },
  { name: '40', scales: [1, 2, 3] },
  { name: '60', scales: [2, 3] },
  { name: '76', scales: [1, 2] },
  { name: '83.5', scales: [2] },
  { name: '1024', scales: [1] },
]

console.log('Generating iOS icon sizes...\n')

for (const { name, scales } of sizes) {
  for (const scale of scales) {
    const px = Math.round(parseFloat(name) * scale)
    const scaleSuffix = scale === 1 ? '@1x' : `@${scale}x`
    const filename = `Icon-App-${name}x${name}${scaleSuffix}.png`
    const outputPath = `assets/ios/AppIcon.appiconset/${filename}`

    // Resize maintaining aspect ratio, composite onto transparent canvas centered
    const cmd = `convert -size ${px}x${px} xc:transparent '${sourceIcon}' -resize ${px}x${px} -gravity center -composite '${outputPath}'`
    execSync(cmd, { stdio: 'pipe' })

    console.log(`✓ ${filename}`)
  }
}

console.log('\n✓ All iOS icons generated successfully!')

import path from 'node:path'
import fs from 'node:fs/promises'
import { Command } from 'commander'
import cliProgress from 'cli-progress'
import colors from 'ansi-colors'
import { enhanceBulletPoints } from '../../utils/openai'
import type { BulletPoint } from '../../types'

export const enhanceCommand = new Command('enhance')
  .description('Enhance bullet points with OpenAI')
  .argument('<file>', 'Path to JSON file containing bullet points')
  .option('-o, --output <dir>', 'Output directory', './output')
  .action(async (file: string, options: { output: string }) => {
    try {
      const bar = new cliProgress.SingleBar(
        {
          format: `Progress | ${colors.cyan('{bar}')} | {percentage}% | ETA: {eta}s | {value}/{total}`,
        },
        cliProgress.Presets.shades_classic
      )
      const content = await fs.readFile(file, 'utf-8')
      const bullets: BulletPoint[] = JSON.parse(content)

      bar.start(bullets.length, 0)
      console.log(`Processing ${bullets.length} bullet points...`)

      const enhanced = await enhanceBulletPoints(bullets, (current, total) => {
        bar.increment()
      })

      const outputDir = path.resolve(options.output)
      await fs.mkdir(outputDir, { recursive: true })

      const outputFile = path.join(outputDir, 'enhanced.json')
      await fs.writeFile(outputFile, JSON.stringify(enhanced, null, 2))

      bar.stop()
      console.log(`Successfully enhanced ${enhanced.length} bullet points`)
    } catch (error) {
      console.error('Error enhancing bullet points:', error)
      process.exit(1)
    }
  })

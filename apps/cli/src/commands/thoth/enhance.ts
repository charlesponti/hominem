import { logger } from '@ponti/utils/logger'
import { enhanceBulletPoints, type BulletPoint } from '@ponti/utils/writer'
import colors from 'ansi-colors'
import cliProgress from 'cli-progress'
import { Command } from 'commander'
import fs from 'node:fs/promises'
import path from 'node:path'

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
        cliProgress.Presets.rect
      )
      const content = await fs.readFile(file, 'utf-8')
      const bullets: BulletPoint[] = JSON.parse(content)

      logger.info(`Processing ${bullets.length} bullet points...`)
      bar.start(bullets.length, 0)

      const enhanced = await enhanceBulletPoints(bullets, () => {
        bar.increment()
      })

      const outputDir = path.resolve(options.output)
      await fs.mkdir(outputDir, { recursive: true })

      const outputFile = path.join(outputDir, 'enhanced.json')
      await fs.writeFile(outputFile, JSON.stringify(enhanced, null, 2))

      bar.stop()
      logger.info(`Successfully enhanced ${enhanced.length} bullet points`)
    } catch (error) {
      logger.error(`Error enhancing bullet points: ${error}`)
      process.exit(1)
    }
  })

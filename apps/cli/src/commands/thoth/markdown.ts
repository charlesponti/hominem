import path from 'node:path'
import { Command } from 'commander'
import { parseMarkdownFile, writeBulletPointFiles } from '../../utils/markdown'

export const markdownCommand = new Command('markdown')
  .description('Process markdown files and create JSON files for bullet points')
  .argument('<file>', 'Path to markdown file')
  .option('-o, --output <dir>', 'Output directory', './output')
  .action(async (file: string, options: { output: string }) => {
    try {
      const bullets = await parseMarkdownFile(file)
      const outputDir = path.resolve(options.output)
      await writeBulletPointFiles(bullets, outputDir)
      console.log(`Successfully processed ${bullets.length} bullet points`)
    } catch (error) {
      console.error('Error processing markdown file:', error)
      process.exit(1)
    }
  })

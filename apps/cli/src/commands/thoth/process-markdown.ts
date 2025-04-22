import { db } from '@/db/index'
import { markdownEntries } from '@/db/schema'
import logger from '@/utils/logger'
import { detectTask } from '@hominem/utils/markdown'
import { Command } from 'commander'
import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import readline from 'node:readline'

export const groupMarkdownByHeadingCommand = new Command('group-markdown-by-heading')
  .description('Group markdown content by heading across files and save to separate files')
  .argument('<dir>', 'Directory containing markdown files')
  .option('-o, --output <dir>', 'Output directory', './headings')
  .action(async (dir: string, options: { output: string }) => {
    try {
      const inputDir = path.resolve(process.cwd(), dir)
      const outputDir = path.resolve(process.cwd(), options.output)
      await fs.mkdir(outputDir, { recursive: true })

      const files = await fs.readdir(inputDir)

      for (const fileName of files) {
        if (!fileName.endsWith('.md')) continue
        const filePath = path.join(inputDir, fileName)
        const baseName = path.basename(fileName, '.md')

        const rl = readline.createInterface({
          input: createReadStream(filePath),
          crlfDelay: Number.POSITIVE_INFINITY,
        })
        let currentHeading = ''
        let paragraphBuffer: string[] = []

        async function flushParagraphBuffer() {
          if (!paragraphBuffer.length) return
          const paragraph = paragraphBuffer.join(' ')
          await db.insert(markdownEntries).values({
            section: currentHeading || baseName,
            text: paragraph,
            filePath,
            isTask: false,
            isComplete: false,
            textAnalysis: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          paragraphBuffer = []
        }

        for await (const line of rl) {
          const trimmed = line.trim()
          const headingMatch = /^#{1,6}\s+(.*)/.exec(trimmed)
          if (headingMatch) {
            await flushParagraphBuffer()
            currentHeading = headingMatch[1].trim()
          } else if (/^[-*]\s+/.test(trimmed)) {
            await flushParagraphBuffer()
            // insert bullet point as its own row
            const { isTask, isComplete } = detectTask(trimmed)
            await db.insert(markdownEntries).values({
              filePath,
              text: trimmed,
              section: currentHeading || baseName,
              isTask,
              isComplete,
              textAnalysis: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
          } else if (trimmed) {
            paragraphBuffer.push(trimmed)
          } else {
            await flushParagraphBuffer()
          }
        }
        await flushParagraphBuffer()
        rl.close()
      }
    } catch (err) {
      console.error(err)
      logger.error('Error grouping markdown by heading:', err)
      process.exit(1)
    }
    process.exit(0)
  })

export default groupMarkdownByHeadingCommand

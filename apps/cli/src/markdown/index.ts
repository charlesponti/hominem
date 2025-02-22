#!/usr/bin/env node
import { Command } from 'commander'
import fs from 'node:fs/promises'
import path from 'node:path'
import { MarkdownProcessor } from './markdown-processor'

const program = new Command()

program
  .name('notes')
  .description('Process markdown notes and extract structured data')
  .version('1.0.0')

program
  .command('process')
  .description('Process markdown files in a directory')
  .requiredOption('-d, --dir <directory>', 'Directory containing markdown files')
  .option('-o, --output <file>', 'Output JSON file', 'processed_data.json')
  .action(async (options) => {
    try {
      const processor = new MarkdownProcessor()
      const files = await fs.readdir(options.dir)
      const markdownFiles = files.filter((file) => file.endsWith('.md'))

      const allNotes = []

      for (const file of markdownFiles) {
        const filepath = path.join(options.dir, file)
        const content = await fs.readFile(filepath, 'utf-8')
        const processed = await processor.processFile(file, content)

        allNotes.push(
          ...processed.headings.map((h) => ({
            file,
            heading: h,
            text: '',
            tag: 'heading',
          })),
          ...processed.paragraphs,
          ...processed.bulletPoints,
          ...processed.others
        )
      }

      await fs.writeFile(options.output, JSON.stringify(allNotes, null, 2), 'utf-8')

      console.log(`✅ Processed ${markdownFiles.length} files`)
      console.log(`📝 Output written to ${options.output}`)
    } catch (error) {
      console.error('Error processing files:', error)
      process.exit(1)
    }
  })

program.parse()

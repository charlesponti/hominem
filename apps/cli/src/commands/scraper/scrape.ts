// import { openai } from '@ai-sdk/openai'
import { google as googleAi } from '@ai-sdk/google'
import { logger } from '@ponti/utils/logger'
import { SITE_SCHEMAS, type AVAILABLE_SCHEMAS } from '@ponti/utils/scraping'
import { generateObject } from 'ai'
import { Command } from 'commander'
import * as fs from 'node:fs'
import ora from 'ora'

import rehypeParse from 'rehype-parse'
import rehypeRemark from 'rehype-remark'
import remarkStringify from 'remark-stringify'
import { unified } from 'unified'
import { getSiteHTML } from './utils'

const program = new Command()

const processor = unified().use(rehypeParse).use(rehypeRemark).use(remarkStringify)

interface ScrapeOptions {
  url: string
  query: string
  output: string
  type: AVAILABLE_SCHEMAS
}

async function transformHTMLToSchema(html: string, schema: Zod.AnyZodObject) {
  try {
    const startTime = Date.now()
    const response = await generateObject({
      // model: openai('gpt-4o-mini', { structuredOutputs: true }),
      model: googleAi('gemini-1.5-flash-8b-latest', { structuredOutputs: true }),
      prompt: `
        Transform the following input into structured data. Your responses should be concise, accurate, and match the provided schema.

        ## input
        ${html}
      `,
      schema,
      mode: 'json',
    })
    const duration = Date.now() - startTime
    return { response, duration }
  } catch (error) {
    logger.error('Error transforming HTML to schema:', error)
    throw error
  }
}

program
  .name('scrape')
  .helpCommand(true)
  .requiredOption('-u, --url <url>', 'The URL to scrape')
  .option('-o, --output <output>', 'The output file')
  .option('-t, --type <type>', 'the type of website (airbnb-listing, job, etc)')
  .option('-q, --query <query>', 'The query selector')
  .action(async (options: ScrapeOptions) => {
    const commandStartTime = Date.now()
    let output = options.output
    const schema: Zod.AnyZodObject = SITE_SCHEMAS[options.type as AVAILABLE_SCHEMAS]
    const { url, query } = options

    if (options.type && !schema) {
      logger.error(
        `Schema not found for type: ${options.type}. Options are: ${Object.keys(SITE_SCHEMAS).join(', ')}`
      )
      return
    }

    if (!output) {
      output = `${url.split('/').pop()}.md`
    }

    let html: string
    let markdown: Awaited<ReturnType<typeof processor.process>>
    const scraperSpinner = ora('Scraping website').start()
    try {
      html = await getSiteHTML(url, query)
      markdown = await processor.process(html)
      scraperSpinner.succeed('Scraping completed')
    } catch (error) {
      scraperSpinner.fail('Scraping failed')
      logger.error('Error scraping website:', error)
      process.exit(1)
    }

    if (schema) {
      const transformSpinner = ora('Transforming HTML to schema').start()
      try {
        const { response, duration } = await transformHTMLToSchema(markdown.toString(), schema)
        transformSpinner.succeed(`Transformation completed (${duration} ms)`)
        const transformedOutputPath = output.replace('.md', '.json')
        fs.writeFileSync(transformedOutputPath, JSON.stringify(response, null, 2))
        logger.info(`Data saved to ${transformedOutputPath}`)
      } catch (error) {
        transformSpinner.fail('Transformation failed')
        logger.error('Error transforming HTML to schema:', error)
        // Save the markdown file even if transformation fails
        fs.writeFileSync(output, String(markdown))
        throw error
      }
    } else {
      fs.writeFileSync(output, String(markdown))
    }

    logger.info(`Data saved to ${output}`)

    ora().succeed(
      `Scraping completed successfully. Total duration: ${Date.now() - commandStartTime} ms`
    )
  })

export default program

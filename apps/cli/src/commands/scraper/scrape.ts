import { logger } from '@ponti/utils/logger'
import {
  SITE_SCHEMAS,
  getJobPostingFromHTML,
  parseLinkedinJobUrl,
  transformHTMLToSchema,
  type AVAILABLE_SCHEMAS,
} from '@ponti/utils/scraping'
import { Command } from 'commander'
import * as fs from 'node:fs'
import ora from 'ora'
import rehypeParse from 'rehype-parse'
import rehypeRemark from 'rehype-remark'
import remarkStringify from 'remark-stringify'
import { unified } from 'unified'
import { getSiteHTML } from './utils'

const program = new Command()

async function getMarkdownFromURL(url: string, query: string) {
  const processor = unified().use(rehypeParse).use(rehypeRemark).use(remarkStringify)
  const html = await getSiteHTML(url, query)
  return processor.process(html)
}

interface ScrapeOptions {
  url: string
  query: string
  output: string
  type: AVAILABLE_SCHEMAS
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
    const { url } = options
    let query = options.query
    let output = options.output
    let urlType = options.type

    const schema: Zod.AnyZodObject = SITE_SCHEMAS[urlType as AVAILABLE_SCHEMAS]

    // If the user provides a type, but the schema is not found, log an error and exit
    if (urlType && !schema) {
      logger.error(
        `Schema not found for type: ${options.type}. Options are: ${Object.keys(SITE_SCHEMAS).join(', ')}`
      )
      return
    }

    if (!output) {
      output = `${url.split('/').pop()}.md`
    }

    const { isJobPosting, query: jobQuery } = parseLinkedinJobUrl(url)
    if (isJobPosting) {
      urlType = 'job-posting'
      // Prefer the query provided by the user, otherwise use the query from the URL
      query = query ?? jobQuery
    }

    let markdown: Awaited<ReturnType<typeof getMarkdownFromURL>>
    const scraperSpinner = ora('Scraping website').start()
    try {
      markdown = await getMarkdownFromURL(url, query)
      scraperSpinner.succeed('Scraping completed')
    } catch (error) {
      scraperSpinner.fail('Scraping failed')
      logger.error('Error scraping website:', error)
      process.exit(1)
    }

    if (schema) {
      const transformSpinner = ora('Transforming HTML to schema').start()

      try {
        let object: Zod.infer<typeof schema>
        let duration: number
        let transformedOutputPath: string

        switch (urlType) {
          case 'job-posting': {
            const res = await getJobPostingFromHTML(markdown.toString())
            object = res.object
            duration = res.duration
            transformedOutputPath = `${res.object.companyName}-${res.object.jobTitle}.json`
            break
          }
          case 'airbnb-listing': {
            const res = await transformHTMLToSchema(markdown.toString(), schema)
            object = res.object
            duration = res.duration
            transformedOutputPath = output.replace('.md', '.json')
            break
          }
          default: {
            throw new Error(`Unsupported type: ${urlType}`)
          }
        }

        transformSpinner.succeed(`Transformation completed (${duration} ms)`)
        saveMarkdownFile(output, markdown.toString())
        fs.writeFileSync(transformedOutputPath, JSON.stringify(object, null, 2))
        logger.info(`Data saved to ${transformedOutputPath}`)
      } catch (error) {
        transformSpinner.fail('Transformation failed')
        logger.error('Error transforming HTML to schema:', error)
        // Save the markdown file even if transformation fails
        saveMarkdownFile(output, markdown.toString())
        throw error
      }
    } else {
      saveMarkdownFile(output, markdown.toString())
    }

    ora().succeed(
      `Scraping completed successfully. Total duration: ${Date.now() - commandStartTime} ms`
    )
  })

export default program

function saveMarkdownFile(output: string, markdown: string) {
  fs.writeFileSync(output, markdown)
  logger.info(`Data saved to ${output}`)
}

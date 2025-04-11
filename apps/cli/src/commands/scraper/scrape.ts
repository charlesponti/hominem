import { logger } from '@/logger'
import {
  SITE_SCHEMAS,
  getJobPostingFromHTML,
  getMarkdownFromURL,
  parseLinkedinJobUrl,
  transformHTMLToSchema,
  type AVAILABLE_SCHEMAS,
  type MarkdownFromURL,
} from '@hominem/utils/scraping'
import { Command } from 'commander'
import * as fs from 'node:fs'
import ora from 'ora'

const program = new Command()

interface ScrapeOptions {
  url: string
  query: string
  output: string
  type: AVAILABLE_SCHEMAS
  images?: boolean
}

program
  .name('scrape')
  .helpCommand(true)
  .requiredOption('-u, --url <url>', 'The URL to scrape')
  .option('-o, --output <output>', 'The output file')
  .option('-t, --type <type>', 'the type of website (airbnb-listing, job, etc)')
  .option('-q, --query <query>', 'The query selector')
  .option('-i, --images', 'Extract and save image URLs')
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

    // If the user does not provide an output, use the last part of the URL
    if (!output) {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname

      // Remove empty strings from the array. This can occur if the URL ends with a slash.
      const urlParts = pathname.split('/').filter(Boolean)

      output = `${urlObj.hostname.replace(/^www\./gi, '')} - ${urlParts.pop()}.md`
    }

    const { isJobPosting, query: jobQuery } = parseLinkedinJobUrl(url)
    if (isJobPosting) {
      urlType = 'job-posting'
      // Prefer the query provided by the user, otherwise use the query from the URL
      query = query ?? jobQuery
    }

    let markdown: Awaited<MarkdownFromURL>
    const scraperSpinner = ora('Scraping website').start()
    try {
      markdown = await getMarkdownFromURL(url)
      scraperSpinner.succeed('Scraping completed')

      if (options.images) {
        const imageUrls = markdown
          .toString()
          .split('\n')
          .filter((line) => line.includes('![Image]'))
          .map((line) => {
            // Extract image URL from markdown link format
            const match = line.match(/\!\[Image\]\(([^)]+)\)/)
            return match ? match[1].replace(/\\/g, '') : ''
          })
        const imagesOutputPath = output.replace(/\.(md|json)$/, '-images.json')
        fs.writeFileSync(imagesOutputPath, JSON.stringify({ images: imageUrls }, null, 2))
        logger.info(`Image URLs saved to ${imagesOutputPath}`)
      }
    } catch (error) {
      scraperSpinner.fail('Scraping failed')
      logger.error('Error scraping website:', error)
      process.exit(1)
    }

    if (markdown.toString().length === 0) {
      logger.error('No content found on the website')
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
            transformedOutputPath = `${res.object.companyName} - ${res.object.jobTitle}.json`
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

    const seconds = ((Date.now() - commandStartTime) / 1000).toFixed(2)
    ora().succeed(`Scraping completed successfully. Total duration: ${seconds} seconds`)
  })

export default program

function saveMarkdownFile(output: string, markdown: string) {
  fs.writeFileSync(output, markdown)
  logger.info(`Data saved to ${output}`)
}

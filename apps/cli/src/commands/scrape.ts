import * as fs from 'node:fs'
import { JSDOM } from 'jsdom'
import { Command } from 'commander'
import { logger } from '@ponti/utils/logger'

const program = new Command()

interface ScrapeOptions {
  attribute: string
  url: string
  query: string
  output: string
}

program
  .name('scrape')
  .requiredOption('-u, --url <url>', 'The URL to scrape')
  .requiredOption('-q, --query <query>', 'The query selector')
  .requiredOption('-o, --output <output>', 'The output file')
  .option('-a, --attribute <attribute>', 'Get element attribute')
  .action(async (options: ScrapeOptions) => {
    const { attribute, url, query, output } = options

    try {
      const response = await fetch(url)
      const html = await response.text()
      const dom = new JSDOM(html)
      const items = dom.window.document.querySelectorAll(query)

      const results = Array.from(items)
        .map((item) => {
          if (!item.textContent) {
            return null
          }

          console.log(attribute)
          if (attribute) {
            return { [attribute]: item.getAttribute(attribute) }
          }

          return item.textContent.trim()
        })
        .filter(Boolean)

      fs.writeFileSync(output, JSON.stringify(results, null, 2))

      logger.info('Data saved to output.json')
    } catch (error) {
      logger.error('Error:', error)
    }
  })

export default program

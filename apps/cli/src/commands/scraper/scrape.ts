import { logger } from '@ponti/utils/logger'
import { Command } from 'commander'
import * as fs from 'node:fs'
import { chromium } from 'playwright'
import rehypeParse from 'rehype-parse'
import rehypeRemark from 'rehype-remark'
import remarkStringify from 'remark-stringify'
import { unified } from 'unified'

const program = new Command()

const processor = unified().use(rehypeParse).use(rehypeRemark).use(remarkStringify)

interface ScrapeOptions {
  url: string
  query: string
  output: string
}

program
  .name('scrape')
  .requiredOption('-u, --url <url>', 'The URL to scrape')
  .requiredOption('-o, --output <output>', 'The output file')
  .option('-q, --query <query>', 'The query selector')
  .action(async (options: ScrapeOptions) => {
    const { url, query, output } = options

    try {
      // Launch the browser
      const browser = await chromium.launch()
      // Open a new tab
      const page = await browser.newPage()
      // Navigate to the page provided by the user
      await page.goto(url)
      // Wait for the page to be fully loaded
      await page.waitForLoadState('domcontentloaded')

      let html: string
      if (query) {
        const elements = await page.$$(query)
        const htmlParts = await Promise.all(
          elements.map((el) =>
            el.evaluate((node) => {
              if (node.isConnected && window.getComputedStyle(node).display !== 'none') {
                return node.outerHTML || ''
              }
              return ''
            })
          )
        )
        html = htmlParts.filter((text) => text.trim()).join('\n\n')
      } else {
        html = await page.evaluate(() => {
          const clone = document.body.cloneNode(true) as HTMLElement
          // Remove hidden elements
          const els = Array.from(clone.querySelectorAll('*'))

          for (const el of els) {
            // Get element of current element
            const style = window.getComputedStyle(el)
            // Check if the element is visible to the user. If the element is not visible, remove it.
            if (style.display === 'none' || style.visibility === 'hidden') {
              el.remove()
            }
          }

          return clone.innerHTML
        })
      }

      const markdown = await processor.process(html)
      fs.writeFileSync(output, String(markdown))
      await browser.close()

      logger.info(`Data saved to ${output}`)
    } catch (error) {
      logger.error('Error:', error)
    }
  })

export default program

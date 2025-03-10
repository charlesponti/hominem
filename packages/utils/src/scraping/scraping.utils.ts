import type { Page } from 'playwright'
import rehypeParse from 'rehype-parse'
import rehypeRemark from 'rehype-remark'
import remarkStringify from 'remark-stringify'
import { unified } from 'unified'
import { getBrowser } from './browser'

async function removeHiddenElements(page: Page) {
  return await page.evaluate(() => {
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

export async function getSiteHTML(url: string, query?: string): Promise<string> {
  try {
    // Launch the browser with non-headless mode and args to bypass automation detections
    const browser = await getBrowser()
    // Open a new tab
    const page = await browser.newPage({
      // Set a realistic User-Agent
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36',
    })

    // Navigate to the page provided by the user
    await page.goto(url)
    // Wait a random delay to mimic human browsing
    await page.waitForTimeout(Math.random() * 2000 + 1000)
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
      html = await removeHiddenElements(page)
    }

    // Now that we have the html, we can close the browser.
    await browser.close()
    return html
  } catch (error) {
    console.error('Error getting site HTML:', error)
    throw error
  }
}

export type MarkdownFromURL = ReturnType<typeof getMarkdownFromURL>
export async function getMarkdownFromURL(url: string, query: string) {
  const processor = unified().use(rehypeParse).use(rehypeRemark).use(remarkStringify)

  // Use Playwright to get the HTML of the website
  const html = await getSiteHTML(url)

  // Convert the HTML to markdown
  return processor.process(html)
}

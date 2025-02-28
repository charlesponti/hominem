import { chromium, type Page } from 'playwright'
import rehypeParse from 'rehype-parse'
import rehypeRemark from 'rehype-remark'
import remarkStringify from 'remark-stringify'
import { unified } from 'unified'

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

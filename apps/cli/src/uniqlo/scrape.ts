import { getBrowser, getContext } from '@hominem/utils/scraping'
import { consola } from 'consola'
import * as fs from 'node:fs'
import path from 'node:path'
import ora from 'ora'

async function scrapeUniqlo() {
  const SCRATCHPAD_DIR = path.resolve(__dirname)

  if (!SCRATCHPAD_DIR) {
    consola.error('SCRATCHPAD_DIR environment variable is required')
    process.exit(1)
  }

  consola.info('🚀 Starting Uniqlo scraper...')

  const spinner = ora('Launching browser').start()
  const browser = await getBrowser()
  const context = await getContext(browser)
  const page = await context.newPage()
  spinner.succeed()

  spinner.start("Navigating to Uniqlo men's section")
  await page.goto('https://www.uniqlo.com/us/en/men')
  spinner.succeed()

  spinner.start('Navigating to T-Shirts section')
  // const tab = await page.$('[role="tab"][id*=\'men\']')
  const tab = await page.$('header')
  if (!tab) {
    consola.error('Tab not found')
    process.exit(1)
  }
  await tab.hover()
  await page.getByRole('button', { name: 'T-Shirts, Sweats & Fleece T-' }).click()
  await page.getByRole('link', { name: 'All T-Shirts, Sweats & Fleece' }).click()

  const declineOfferButton = page.getByRole('button', { name: 'Decline offer' })
  if ((await declineOfferButton.count()) > 0) {
    spinner.text = 'Declining offer popup'
    await declineOfferButton.click()
  }
  spinner.succeed()

  spinner.start('Filtering for size M')
  await page.getByRole('cell', { name: 'Size' }).locator('svg').click()
  await page.getByRole('dialog').locator('label').filter({ hasText: 'M' }).click()
  await page.goto('https://www.uniqlo.com/us/en/men/tops?path=22211%2C23305%2C%2C&sizeCodes=SMA004')
  spinner.succeed()

  spinner.start('Scraping product information')
  const products = await page.$$('.fr-ec-product-tile')
  const results: {
    image: string | null
    productTitle: string | null
    price: number | null
  }[] = []

  for (const product of products) {
    const [image, productTitle, price] = await Promise.all([
      (await product.$$('img'))[0].getAttribute('src'),
      (await product.$$('h3'))[0].textContent(),
      (await product.$$('.fr-ec-price'))[0].textContent(),
    ])
    results.push({
      image,
      productTitle,
      price: Number.parseFloat(price?.slice(1) || '0'),
    })
  }
  spinner.succeed(`Found ${results.length} products`)

  spinner.start('Cleaning up browser')
  await context.close()
  await browser.close()
  spinner.succeed()

  spinner.start('Saving results to file')
  fs.writeFileSync(path.resolve(SCRATCHPAD_DIR, './results.json'), JSON.stringify(results, null, 2))
  spinner.succeed('Results saved to results.json')

  consola.info('✨ Scraping completed successfully!')

  return results
}
;(async () => {
  try {
    const results = await scrapeUniqlo()
    consola.info('Scraping results:', results)
  } catch (error) {
    consola.error('❌ Error during scraping:', error)
    process.exit(1)
  } finally {
    consola.info('🛑 Scraping process has ended.')
  }
})()

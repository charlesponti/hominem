import { logger } from '@ponti/utils/logger'
import * as fs from 'node:fs'
import ora from 'ora'
import { chromium } from 'playwright'

async function scrapeUniqlo() {
  logger.info('🚀 Starting Uniqlo scraper...')

  const spinner = ora('Launching browser').start()
  const browser = await chromium.launch({
    headless: false,
  })
  const context = await browser.newContext()
  const page = await context.newPage()
  spinner.succeed()

  spinner.start("Navigating to Uniqlo men's section")
  await page.goto('https://www.uniqlo.com/us/en/men')
  await page.getByRole('tab', { name: 'men', exact: true }).click()
  await page.goto('https://www.uniqlo.com/us/en/men')
  spinner.succeed()

  spinner.start('Navigating to T-Shirts section')
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
  fs.writeFileSync('./results.json', JSON.stringify(results, null, 2))
  spinner.succeed('Results saved to results.json')

  logger.info('✨ Scraping completed successfully!')

  return results
}

;(async () => {
  const results = await scrapeUniqlo()
  console.log('Scraping results:', results)
})().catch((error) => {
  console.error('❌ Error during scraping:', error)
  process.exit(1)
})

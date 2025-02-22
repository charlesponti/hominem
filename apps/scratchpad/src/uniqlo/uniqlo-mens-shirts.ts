import * as fs from 'node:fs'
import { chromium } from 'playwright'

const browser = await chromium.launch({
  headless: false,
})
const context = await browser.newContext()
const page = await context.newPage()
await page.goto('https://www.uniqlo.com/us/en/men')
await page.getByRole('tab', { name: 'men', exact: true }).click()
await page.goto('https://www.uniqlo.com/us/en/men')
await page.getByRole('button', { name: 'T-Shirts, Sweats & Fleece T-' }).click()
await page.getByRole('link', { name: 'All T-Shirts, Sweats & Fleece' }).click()
await page.getByRole('button', { name: 'Decline offer' }).click()
await page.getByRole('cell', { name: 'Size' }).locator('svg').click()
await page.getByRole('dialog').locator('label').filter({ hasText: 'M' }).click()
await page.goto('https://www.uniqlo.com/us/en/men/tops?path=22211%2C23305%2C%2C&sizeCodes=SMA004')

// Find every component with .fr-ec-product-tile
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

await context.close()
await browser.close()

fs.writeFileSync('./results.json', JSON.stringify(results, null, 2))

process.exit(0)

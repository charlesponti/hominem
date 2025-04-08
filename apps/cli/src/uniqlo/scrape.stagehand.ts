import { env } from '@/env'
import { Stagehand } from '@browserbasehq/stagehand'
import fs from 'node:fs'
import path from 'node:path'
import ora from 'ora'
import { z } from 'zod'
const SCRATCHPAD_DIR = path.resolve(__dirname, 'output')

if (!fs.existsSync(SCRATCHPAD_DIR)) {
  fs.mkdirSync(SCRATCHPAD_DIR, { recursive: true })
}
async function main() {
  const spinner = ora('Launching browser').start()
  spinner.color = 'cyan'
  spinner.text = 'Initializing Stagehand...'
  const stagehand = new Stagehand({
    env: 'LOCAL',
    modelName: 'gpt-4o-mini',
    modelClientOptions: {
      apiKey: env.OPENAI_API_KEY,
    },
  })

  await stagehand.init()

  const page = stagehand.page

  spinner.text = 'Launching browser'
  await page.goto('https://www.uniqlo.com')
  await page.act('Go to mens shirts page')
  spinner.text = 'Navigating to Uniqlo mens sales section'
  await page.act('go to sales')

  spinner.text = 'Checking for offer modal'
  const declineOfferButton = page.getByRole('button', { name: 'Decline offer' })
  if ((await declineOfferButton.count()) > 0) {
    spinner.text = 'Declining offer popup'
    await declineOfferButton.click()
  }
  await new Promise((resolve) => setTimeout(resolve, 1000))

  spinner.text = 'Filtering for size M'
  await page.act('filter for size M')
  await page.act('scroll to the bottom of the page')

  spinner.text = 'Extracting product information'
  const { products } = await page.extract({
    instruction: 'Extract the product information from the page',
    schema: z.object({
      products: z.array(
        z.object({
          title: z.string().describe('The title of the product'),
          price: z.string().describe('The price of the product'),
          imageURL: z.string().describe('The image URL of the product'),
          link: z.string().describe('The link to the product'),
        })
      ),
    }),
  })

  const productss = await page.$$('.fr-ec-product-tile')
  const results: {
    image: string | null
    productTitle: string | null
    price: number | null
  }[] = []

  for (const product of productss) {
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

  fs.writeFileSync(path.resolve(SCRATCHPAD_DIR, './results.json'), JSON.stringify(results, null, 2))
  fs.writeFileSync(
    path.resolve(SCRATCHPAD_DIR, './products.json'),
    JSON.stringify(products, null, 2)
  )
  console.log('Results saved to results.json')
}

main()

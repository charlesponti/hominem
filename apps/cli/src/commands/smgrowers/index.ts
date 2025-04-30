import { redis } from '@hominem/utils/redis'
import { Command } from 'commander'
import { consola } from 'consola'
import * as fs from 'node:fs'
import * as path from 'node:path'
import ora from 'ora'
import { chromium, type Browser, type Page } from 'playwright-chromium'

export const command = new Command('smgrowers').description(
  'Commands for interacting with SM Growers website'
)

export default command

interface PlantInfo {
  name: string
  scientificName: string
  category?: string
  family?: string
  origin?: string
  flowerColor?: string
  bloomtime?: string
  synonyms?: string
  height?: string
  width?: string
  exposure?: string
  seaside?: string
  irrigation?: string
  winterHardiness?: string
  poisonous?: string
  description?: string
  url: string
}

interface PlantLink {
  name: string
  url: string
}

async function main() {
  // Launch the browser
  const browser: Browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page: Page = await context.newPage()

  const plantQueueKey = 'plant_queue'

  try {
    // Go to the plant index page
    await page.goto('https://www.smgrowers.com/plantindx.asp', { waitUntil: 'domcontentloaded' })
    consola.info('Loaded plant index page') // Replaced console.log

    // Get all plant links
    const plantLinks = await page.evaluate<PlantLink[]>(() => {
      const plants: PlantLink[] = []
      const links = Array.from(document.querySelectorAll('td > a'))

      for (const link of links) {
        const href = link.getAttribute('href')
        if (href?.includes('plantdisplay.asp')) {
          if (!link.textContent) {
            console.warn('Found a plant link with no text:', link) // Keep console.warn inside evaluate
            continue
          }
          plants.push({
            name: link.textContent.trim(),
            url: new URL(href, window.location.origin).href,
          })
        }
      }

      return plants
    })

    consola.info(`Found ${plantLinks.length} plant links`) // Replaced console.log

    // Add plant links to Redis queue
    for (const plantLink of plantLinks) {
      await redis.lpush(plantQueueKey, JSON.stringify(plantLink))
    }

    const spinner = ora('Starting plant scraping').start()

    // Process plants from the queue
    while (true) {
      const plantData = await redis.rpop(plantQueueKey)

      if (!plantData) {
        spinner.succeed('All plants scraped')
        break
      }

      const plant: PlantLink = JSON.parse(plantData) as PlantLink

      spinner.text = `Scraping: ${plant.name} - ${plant.url}`

      try {
        await page.goto(plant.url, { waitUntil: 'domcontentloaded' })

        // Extract plant information
        const plantHtml = await page.evaluate(
          ({ name, url }) => {
            const table = document.querySelector("td[width='100%'][valign='top']")
            return table?.outerHTML || `<div>Could not find table for ${name}</div>`
          },
          { name: plant.name, url: plant.url }
        )

        // Save the HTML to a file
        const outputDir = path.join(__dirname, 'output')
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true })
        }
        const fileName = `${plant.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`
        const outputPath = path.join(outputDir, fileName)
        fs.writeFileSync(outputPath, plantHtml)

        spinner.text = `Saved HTML to ${outputPath}`

        // Delay to avoid hammering the server
        await new Promise((resolve) => setTimeout(resolve, 10000))
      } catch (error) {
        spinner.warn(`Failed to scrape ${plant.name}. Adding back to queue.`)
        consola.error(`Scrape error for ${plant.name}: ${error}`)

        await redis.lpush(plantQueueKey, JSON.stringify(plant))
      }
    }
  } catch (error) {
    consola.error('An error occurred:', error) // Replaced console.error
  } finally {
    await browser.close()
  }
}

main()

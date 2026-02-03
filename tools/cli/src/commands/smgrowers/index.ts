import { redis } from '@hominem/services/redis'
import { Command } from 'commander'
import { consola } from 'consola'
import * as fs from 'node:fs'
import * as path from 'node:path'
import ora from 'ora'
import * as cheerio from 'cheerio'

export const command = new Command('smgrowers').description(
  'Commands for interacting with SM Growers website',
)

export default command

interface PlantLink {
  name: string
  url: string
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }
  return response.text()
}

async function main() {
  const plantQueueKey = 'plant_queue'

  try {
    // Fetch the plant index page
    consola.info('Fetching plant index page')
    const indexHtml = await fetchHtml('https://www.smgrowers.com/plantindx.asp')
    const $index = cheerio.load(indexHtml)

    // Get all plant links
    const plantLinks: PlantLink[] = []
    $index('td > a').each((_, element) => {
      const $link = $index(element)
      const href = $link.attr('href')
      if (href?.includes('plantdisplay.asp')) {
        const text = $link.text().trim()
        if (!text) {
          consola.warn('Found a plant link with no text:', href)
          return
        }
        plantLinks.push({
          name: text,
          url: new URL(href, 'https://www.smgrowers.com').href,
        })
      }
    })

    consola.info(`Found ${plantLinks.length} plant links`)

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
        // Fetch plant detail page
        const plantHtml = await fetchHtml(plant.url)
        const $plant = cheerio.load(plantHtml)

        // Extract plant information
        const $table = $plant("td[width='100%'][valign='top']")
        const tableHtml = $table.length ? $table.html()! : `<div>Could not find table for ${plant.name}</div>`

        // Save the HTML to a file
        const outputDir = path.join(process.cwd(), 'output')
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true })
        }
        const fileName = `${plant.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`
        const outputPath = path.join(outputDir, fileName)
        fs.writeFileSync(outputPath, tableHtml)

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
    consola.error('An error occurred:', error)
  }
}

main()

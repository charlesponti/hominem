import { downloadImage } from '@hominem/utils/scraping'
import * as cheerio from 'cheerio'
import { consola } from 'consola'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as process from 'node:process'
import ora from 'ora'

const plantFiles = fs.readdirSync(path.join(__dirname, 'output'))

// Create the parsed_images directory if it doesn't exist
const imagesDir = path.join(process.cwd(), 'parsed_images')
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true })
  consola.info(`Created image directory: ${imagesDir}`)
}

// Create a write stream to write the JSON to
const outputPath = path.join(process.cwd(), 'plants.json')
const writeStream = fs.createWriteStream(outputPath)
writeStream.write('[\n')

// Helper function to convert field names to standardized keys
const createFieldKey = (fieldName: string): string => {
  return fieldName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_') // Replace non-alphanumeric with underscore
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
}

// Helper function to clean text content
const cleanText = (text: string): string => {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces, tabs, newlines with single space
    .trim() // Remove leading/trailing whitespace
}

let index = 0
const spinner = ora('Parsing plant pages').start()
const totalFiles = plantFiles.length

function getNames($: ReturnType<typeof cheerio.load>): {
  fullName: string
  botanicalName: string
  commonName: string
} {
  const fullName = cleanText($('td[bgcolor="#e9ebce"].largeheader').first().text())
  let [botanicalName, commonName] = ['', '']
  if (fullName.includes('-')) {
    const splitName = fullName.split('-', 2).map((s) => s.trim())
    if (splitName[0] && splitName[1]) {
      botanicalName = splitName[0]
      commonName = splitName[1]
    } else {
      botanicalName = fullName
    }
  } else {
    botanicalName = fullName
  }

  return { fullName, botanicalName, commonName }
}

for (const file of plantFiles) {
  try {
    index++
    spinner.text = `(${index} / ${totalFiles}) Parsing: ${file.replace(/\.html$/, '')}`
    const html = fs.readFileSync(path.join(__dirname, 'output', file), 'utf-8')
    const $ = cheerio.load(html)

    // Extract plant data
    const { fullName, botanicalName, commonName } = getNames($)

    // Clean up image URL
    const imageUrl = $("img[alt*='Image of']").attr('src')?.trim() || ''

    // Create base plant data object
    const plantData: Record<string, string> = {
      fullName,
      botanicalName,
      commonName,
      imageUrl,
    }

    // Dynamically extract all fields from the habit and cultural information table
    const habitAndCulturalInfoTable = $('table[bgcolor="#669999"]')
    const infoRows = habitAndCulturalInfoTable.find('td.lighttext')

    infoRows.each((_, element) => {
      const text = cleanText($(element).text())
      if (text.includes(':')) {
        const [fieldName, ...valueParts] = text.split(':')
        const fieldValue = cleanText(
          valueParts
            .join(':')
            .replace(/\(H2O\s*Info\)/, '')
            .replace(/\(More\s*Info\)/, '')
        )

        if (fieldName && fieldValue) {
          const key = createFieldKey(fieldName)
          plantData[key] = fieldValue
        }
      }
    })

    // Extract description more reliably
    const descriptionTable = $('table:has(td > img[src*="spacer.gif"][width="13"][height="1"])')
    let description = ''

    // First try to get each paragraph separately and join them with proper spacing
    const paragraphs: string[] = []
    descriptionTable.find('p').each((_, elem) => {
      const paragraphText = cleanText($(elem).text())
      if (paragraphText) {
        paragraphs.push(paragraphText)
      }
    })

    if (paragraphs.length > 0) {
      description = paragraphs.join(' ')
    } else {
      // Fallback: Get all text and clean it
      description = cleanText(descriptionTable.text())
      if (!description) {
        consola.warn('Could not find description for plant')
      }
    }

    plantData.description = description

    // Download the image if available
    if (imageUrl) {
      const localImagePath = await downloadImage({
        imagesDir,
        imageUrl,
        name: botanicalName,
      })
      if (localImagePath) {
        plantData.img = localImagePath
      }
    }

    // Write to file
    const jsonString = JSON.stringify(plantData, null, 2)
    writeStream.write(jsonString)

    // Add comma if not the last file
    if (index < totalFiles) {
      writeStream.write(',\n')
    } else {
      writeStream.write('\n')
    }

    consola.info('Parsed plant info:', plantData)
  } catch (error) {
    spinner.fail(`Error parsing file ${file}: ${error}`)
    // Continue with next file instead of failing completely
    consola.error(`Error parsing file ${file}: ${error}`)
    // if (index < totalFiles) {
    //   writeStream.write(JSON.stringify({ error: `Failed to parse ${file}` }) + ',\n')
    // }
  }
}

writeStream.write(']') // Close the array

writeStream.end() // Close the stream

writeStream.on('finish', () => {
  spinner.succeed(`JSON written successfully to ${outputPath}!`)
  spinner.succeed('Parsing complete!')
  process.exit(0)
})

writeStream.on('error', (error) => {
  spinner.fail(`Error writing JSON: ${error}`)
  process.exit(1)
})

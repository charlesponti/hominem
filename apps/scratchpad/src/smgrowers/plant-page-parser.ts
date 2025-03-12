import * as cheerio from 'cheerio'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as process from 'node:process'
import ora from 'ora'

const plantFiles = fs.readdirSync(path.join(__dirname, 'output'))

// Create a write stream to write the JSON to
const outputPath = path.join(process.cwd(), 'plants.json')
console.log(`Writing JSON to: ${outputPath}`)
const writeStream = fs.createWriteStream(outputPath)
writeStream.write('[\n')

let index = 0
const spinner = ora('Parsing plant pages').start()
const totalFiles = plantFiles.length

for (const file of plantFiles) {
  index++
  spinner.text = `(${index} / ${totalFiles}) Parsing: ${file.replace(/\.html$/, '')}`
  const html = fs.readFileSync(path.join(__dirname, 'output', file), 'utf-8')
  const $ = cheerio.load(html)

  // Extract plant data
  const fullName = $('td[bgcolor="#e9ebce"].largeheader').text().trim()
  const [botanicalName, commonName] = fullName.split('-').map((s) => s.trim())
  const imageUrl = $("img[alt*='Image of']").attr('src')
  const habitAndCulturalInfoTable = $('table[bgcolor="#669999"]')
  const category = habitAndCulturalInfoTable
    .find('td.lighttext:contains("Category:")')
    .text()
    .replace('Category: ', '')
    .trim()
  const family = habitAndCulturalInfoTable
    .find('td.lighttext:contains("Family:")')
    .text()
    .replace('Family: ', '')
    .trim()
  const origin = habitAndCulturalInfoTable
    .find('td.lighttext:contains("Origin:")')
    .text()
    .replace('Origin: ', '')
    .trim()
  const evergreen = habitAndCulturalInfoTable
    .find('td.lighttext:contains("Evergreen:")')
    .text()
    .replace('Evergreen: ', '')
    .trim()
  const yellowFoliage = habitAndCulturalInfoTable
    .find('td.lighttext:contains("Yellow/Chartreuse Foliage:")')
    .text()
    .replace('Yellow/Chartreuse Foliage: ', '')
    .trim()
  const flowerColor = habitAndCulturalInfoTable
    .find('td.lighttext:contains("Flower Color:")')
    .text()
    .replace('Flower Color: ', '')
    .trim()
  const bloomtime = habitAndCulturalInfoTable
    .find('td.lighttext:contains("Bloomtime:")')
    .text()
    .replace('Bloomtime: ', '')
    .trim()
  const parentage = habitAndCulturalInfoTable
    .find('td.lighttext:contains("Parentage:")')
    .text()
    .replace('Parentage: ', '')
    .trim()
  const height = habitAndCulturalInfoTable
    .find('td.lighttext:contains("Height:")')
    .text()
    .replace('Height: ', '')
    .trim()
  const width = habitAndCulturalInfoTable
    .find('td.lighttext:contains("Width:")')
    .text()
    .replace('Width: ', '')
    .trim()
  const exposure = habitAndCulturalInfoTable
    .find('td.lighttext:contains("Exposure:")')
    .text()
    .replace('Exposure: ', '')
    .trim()
  const seaside = habitAndCulturalInfoTable
    .find('td.lighttext:contains("Seaside:")')
    .text()
    .replace('Seaside: ', '')
    .trim()
  const irrigation = habitAndCulturalInfoTable
    .find('td.lighttext:contains("Irrigation")')
    .text()
    .replace('Irrigation', '')
    .replace('(H2O Info):', '')
    .trim()
  const winterHardiness = habitAndCulturalInfoTable
    .find('td.lighttext:contains("Winter Hardiness:")')
    .text()
    .replace('Winter Hardiness: ', '')
    .trim()
  const poisonous = habitAndCulturalInfoTable
    .find('td.lighttext:contains("May be Poisonous")')
    .text()
    .replace('Poisonous: ', '')
    .replace('(More Info)', '')
    .trim()
  const description = $(
    'table:has(td > img[src="https://www.smgrowers.com/images/spacer.gif"][width="13"][height="1"])'
  )
    .text()
    .trim()

  // Create JSON object
  const plantData = {
    fullName,
    botanicalName,
    commonName,
    imageUrl: imageUrl,
    category: category,
    family: family,
    origin: origin,
    evergreen: evergreen,
    yellowFoliage: yellowFoliage,
    flowerColor: flowerColor,
    bloomtime: bloomtime,
    parentage: parentage,
    height: height,
    width: width,
    winterHardiness,
    poisonous: poisonous,
    exposure: exposure,
    seaside: seaside,
    irrigation: irrigation,
    description: description,
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
}

writeStream.write(']') // Close the array
writeStream.end() // Close the stream

spinner.succeed('Parsing complete!')
process.exit(0)

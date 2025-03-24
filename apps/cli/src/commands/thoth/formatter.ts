import fs from 'node:fs'
import path from 'node:path'

async function getOutputContent() {
  const results = {
    events: [] as Array<{ type: string; text: string }>,
    people: [] as Array<{ name: string; text: string }>,
    places: [] as Array<{ name: string; text: string }>,
    thoughts: [] as Array<{ text: string }>,
  }

  const output = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'output_chunks.json'), 'utf-8')
  ) as {
    object: {
      events: Array<{ type: string; text: string }>
      people: Array<{ name: string; text: string }>
      places: Array<{ name: string; text: string }>
      thoughts: Array<{ text: string }>
    }
  }[]

  for (const chunk of output) {
    results.events.push(...chunk.object.events)
    results.people.push(...chunk.object.people)
    results.places.push(...chunk.object.places)
    results.thoughts.push(...chunk.object.thoughts)
  }

  fs.writeFileSync(
    path.join(__dirname, 'formatted.json'),
    JSON.stringify(results, null, 2),
    'utf-8'
  )
}

getOutputContent()

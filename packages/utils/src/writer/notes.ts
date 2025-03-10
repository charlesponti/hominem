import nlp from 'compromise'
import { getDatesFromText } from '../time'
import type { NoteDetails } from '../types/notes'

export function parseNoteDetails(userInput: string): NoteDetails {
  // Parse the input text with compromise
  const doc = nlp(userInput)

  // Initialize default values
  let place = ''
  let category: string[] = []
  let labels: string[] = []
  const { dates } = getDatesFromText(userInput)

  // Extract possible title
  const titleTokens = doc.match('#Verb+ #Noun+').out('array')
  const title = titleTokens.join(' ')

  // Extract place
  const places = doc.places().out('array')
  if (places.length > 0) {
    place = places.join(', ')
  }

  // Extract people
  const people = doc.people().out('array')
  // ! TODO Search user's contacts to find the appropriate people

  // Extract and parse date/time

  // Extract category (#tag)
  const categoryMatch = title.match(/#(\w+)/g)
  if (categoryMatch) {
    category = categoryMatch.map((tag: string) => tag.slice(1))
  }

  // Extract labels (@tag)
  const labelMatches = title.match(/@(\w+)/g)
  if (labelMatches) {
    labels = labelMatches.map((label: string) => label.slice(1))
  }

  return {
    content: doc.all().out('array'),
    people,
    dates,
    category,
    labels,
    place: place || 'No Place Found',
    date_time: dates[0]?.start || 'No Date/Time Found',
  }
}

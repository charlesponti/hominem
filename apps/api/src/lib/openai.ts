import assert from 'node:assert'
import { OpenAI } from 'openai'

const { OPENAI_API_KEY } = process.env

assert(OPENAI_API_KEY, 'Missing OPENAI_API_KEY')

export const openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY })

import { UserSchema } from '@ponti/utils/schema'

export function createCSVRowPrompt(row: Record<string, unknown>) {
  return `Convert the following CSV row to a JSON object that matches this Zod schema:
  ${UserSchema.toString()}
  
  CSV Row:
  ${JSON.stringify(row)}`
}

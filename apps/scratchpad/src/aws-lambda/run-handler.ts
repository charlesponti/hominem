import 'dotenv/config'

import { logger } from '@ponti/utils/logger'
import * as fs from 'node:fs'
import path from 'node:path'
import { mergeWriterData, type LambdaEvent } from './prolog-email-lambda'
import { processAttachments } from './services/attachment.service'
import { parseEmail, processEmailBody, validateEmailBody } from './services/email.service'

async function main() {
  // Set required environment variables
  process.env.S3_BUCKET = 'test-bucket'

  // Read test email file
  const ASSETS_DIR = path.join(__dirname, './test-assets')
  const emailContent = fs.readFileSync(path.join(ASSETS_DIR, 'housebroken.eml'), 'utf-8')

  // Create mock event
  const event: LambdaEvent = {
    Records: [
      {
        ses: {
          mail: {
            content: emailContent,
          },
        },
      },
    ],
  }

  try {
    logger.info('Running email processing pipeline...')
    const email = await parseEmail(event)
    const validatedEmail = await validateEmailBody(email)
    const writerData = await processEmailBody(validatedEmail)
    const attachmentResults = await processAttachments(
      email.attachments,
      writerData.candidates.map((candidate) => candidate.name)
    )
    const result = mergeWriterData(writerData, attachmentResults)

    fs.writeFileSync(path.join(ASSETS_DIR, 'output.json'), JSON.stringify({ result }, null, 2))
    process.exit(0)
  } catch (error) {
    logger.error('Error processing email:', error)
    process.exit(1)
  }
}

main()

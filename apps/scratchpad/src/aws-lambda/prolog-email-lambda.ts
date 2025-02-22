const AWS = require('aws-sdk')
const { ZodError, z } = require('zod')
const axios = require('axios')
const { simpleParser } = require('mailparser')
const pdf = require('pdf-parse')

const s3 = new AWS.S3()
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY
const S3_BUCKET = process.env.S3_BUCKET

// Define Zod schema for writer data
const WriterSchema = z.object({
  name: z.string(),
  genre: z.string(),
  notableWorks: z.array(z.string()),
  awards: z.array(z.string()).optional(),
  background: z.string(),
})

async function callClaudeAPI(prompt) {
  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/chat/completions',
      {
        model: 'claude-3-sonnet-20240229',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
        },
      }
    )
    return response.data.choices[0].message.content
  } catch (error) {
    console.error('Error calling Claude API:', error)
    throw error
  }
}

async function processEmailBody(emailBody) {
  const prompt = `Based on the following email content, extract information about a TV show or movie writer and format it as a JSON object with the following properties: name, genre, notableWorks (array), awards (array, optional), and background. Here's the email content:\n\n${emailBody}`

  const claudeResponse = await callClaudeAPI(prompt)
  const writerData = JSON.parse(claudeResponse)

  return WriterSchema.parse(writerData)
}

async function processAttachment(attachment) {
  const { content, filename } = attachment
  const fileExtension = filename.split('.').pop().toLowerCase()

  let textContent = ''
  if (fileExtension === 'pdf') {
    const pdfData = await pdf(content)
    textContent = pdfData.text.slice(0, 1000) // Approximate first two pages
  } else if (fileExtension === 'txt') {
    textContent = content.toString('utf-8').slice(0, 1000) // Approximate first two pages
  }

  if (textContent) {
    const prompt = `Based on the following text from an attachment, extract any relevant information that could be added to the writer's profile. Focus on additional notable works, awards, or background information:\n\n${textContent}`
    return await callClaudeAPI(prompt)
  }

  return null
}

async function uploadToS3(attachment: { content: Buffer; filename: string }) {
  const { content, filename } = attachment
  const key = `attachments/${Date.now()}-${filename}`

  await s3
    .putObject({
      Bucket: S3_BUCKET,
      Key: key,
      Body: content,
    })
    .promise()

  return `https://${S3_BUCKET}.s3.amazonaws.com/${key}`
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
exports.handler = async (event: any) => {
  try {
    const email = await simpleParser(event.Records[0].ses.mail.content)

    // Process email body
    const writerData = await processEmailBody(email.text)

    // Process attachments
    const attachmentPromises = email.attachments.map(async (attachment) => {
      const additionalInfo = await processAttachment(attachment)
      const s3Link = await uploadToS3(attachment)

      return { additionalInfo, s3Link }
    })

    const attachmentResults = await Promise.all(attachmentPromises)

    // Update writer data with additional information from attachments
    for (const result of attachmentResults) {
      const { additionalInfo } = result
      if (additionalInfo) {
        const info = JSON.parse(additionalInfo)
        Object.assign(writerData, info)
      }
    }

    // Prepare the response
    const response = {
      writerData,
      attachments: attachmentResults.map(({ s3Link }) => s3Link),
    }

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    }
  } catch (error) {
    console.error('Error processing email:', error)

    if (error instanceof ZodError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid writer data format',
          details: error.errors,
        }),
      }
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}

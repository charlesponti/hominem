const AWS = require('aws-sdk')
const csv = require('csv-parser')
const axios = require('axios')
const { Readable } = require('node:stream')
const z = require('zod')

const s3 = new AWS.S3()

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/chat/completions'

async function processCSVRow(row) {
  const prompt = `Convert the following CSV row to a JSON object that matches this Zod schema:
  ${UserSchema.toString()}
  
  CSV Row:
  ${JSON.stringify(row)}
  
  Respond with only the valid JSON object, nothing else.`

  try {
    const response = await axios.post(
      CLAUDE_API_URL,
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

    const jsonString = response.data.choices[0].message.content.trim()
    const parsedJson = JSON.parse(jsonString)

    // Validate the parsed JSON against the Zod schema
    const validatedData = UserSchema.parse(parsedJson)
    return validatedData
  } catch (error) {
    console.error('Error processing row:', error)
    throw error
  }
}

exports.handler = async (event) => {
  const bucketName = event.Records[0].s3.bucket.name
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '))

  try {
    const { Body } = await s3.getObject({ Bucket: bucketName, Key: key }).promise()
    const results = []

    await new Promise((resolve, reject) => {
      Readable.from(Body)
        .pipe(csv())
        .on('data', async (row) => {
          try {
            const processedRow = await processCSVRow(row)
            results.push(processedRow)
          } catch (error) {
            console.error('Error processing row:', error)
          }
        })
        .on('end', () => {
          resolve()
        })
        .on('error', (error) => {
          reject(error)
        })
    })

    // Write results back to S3
    const outputKey = `processed-${key}`
    await s3
      .putObject({
        Bucket: bucketName,
        Key: outputKey,
        Body: JSON.stringify(results, null, 2),
        ContentType: 'application/json',
      })
      .promise()

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'CSV processed successfully',
        outputKey,
      }),
    }
  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error processing CSV',
        error: error.message,
      }),
    }
  }
}

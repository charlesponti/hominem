import { logger } from '@/logger'
import axios from 'axios'
import fs from 'node:fs'
import path from 'node:path'

// Helper function to download image
export async function downloadImage({
  imagesDir,
  imageUrl,
  name,
}: { imagesDir: string; imageUrl: string; name: string }): Promise<string | null> {
  if (!imageUrl) return null

  try {
    // Clean up URL - sometimes there are spaces in the URL
    const cleanUrl = imageUrl.trim()

    // Create a sanitized filename from the plant name
    const sanitizedName = name
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '_')
      .toLowerCase()

    // Extract file extension from URL
    const extension = path.extname(cleanUrl) || '.jpg'

    // Create the local file path
    const filename = `${sanitizedName}${extension}`
    const localPath = path.join(imagesDir, filename)

    // Check if the file already exists
    if (fs.existsSync(localPath)) {
      logger.info(`Image for ${name} already exists at ${localPath}`)
      return localPath
    }

    // Download the image with timeout
    const response = await axios({
      method: 'GET',
      url: cleanUrl,
      responseType: 'stream',
      timeout: 30000, // 30 seconds timeout
    })

    // Save the image to the local path
    const writer = fs.createWriteStream(localPath)
    response.data.pipe(writer)

    return new Promise<string>((resolve, reject) => {
      writer.on('finish', () => {
        // Verify file was created and has content
        if (fs.existsSync(localPath) && fs.statSync(localPath).size > 0) {
          resolve(localPath)
        } else {
          fs.unlinkSync(localPath) // Delete empty file
          reject(new Error('Downloaded file is empty or invalid'))
        }
      })
      writer.on('error', (err) => {
        // Clean up any partially downloaded file
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath)
        }
        reject(err)
      })
    })
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        logger.error(`Timeout downloading image for ${name}`)
      } else if (error.response) {
        logger.error(`HTTP error ${error.response.status} downloading image for ${name}`)
      } else {
        logger.error(`Network error downloading image for ${name}: ${error.message}`)
      }
    } else {
      logger.error(`Error downloading image for ${name}: ${error}`)
    }
    return null
  }
}

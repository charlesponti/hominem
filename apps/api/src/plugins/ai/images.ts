import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import multer from 'multer'
import { supabaseClient } from '../../lib/supabase'
import logger from '../../logger.js'
import { HominemVectorStore } from '../../services/vector.service.js'

const IMAGE_COLLECTION = 'image_collection'

// Save newly uploaded images to the data directory
const upload = multer({ dest: 'data/' }).array('images')

export const imagePlugin: FastifyPluginAsync = async (server) => {
  server.post('/upload-photo', async (request, reply) => {
    const data = await request.file()
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' })
    }

    try {
      const buffer = await data.toBuffer()
      const filename = `${Date.now()}-${data.filename}`

      // Upload to Supabase
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('photos')
        .upload(filename, buffer)

      if (uploadError) {
        return reply.code(500).send({ error: 'Failed to upload photo' })
      }

      // Insert record in database
      const { data: insertData, error: insertError } = await supabaseClient.from('photos').insert({
        filename: data.filename,
        storage_path: uploadData.path,
      })

      // store the image in the vector store
      await HominemVectorStore.embedFromBuffer(buffer)

      if (insertError) {
        return reply.code(500).send({ error: 'Failed to store photo metadata' })
      }

      return reply.send({
        message: 'Photo uploaded and embedded successfully',
        data: insertData,
      })
    } catch (error) {
      logger.error('Upload error:', error)
      return reply.code(500).send({ error: 'Failed to process photo upload' })
    }
  })

  server.get('/', async (req, reply) => {
    const params = req.query as { page: string; pageSize: string }
    const page = Number.parseInt(params.page || '1', 10)
    const pageSize = Number.parseInt(params.pageSize || '10', 10)

    if (Number.isNaN(page) || Number.isNaN(pageSize)) {
      return reply.code(400).send({ error: 'Invalid page or pageSize parameters' })
    }

    try {
      const { data, error } = await supabaseClient.storage.from('photos').list('', {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        sortBy: { column: 'created_at', order: 'desc' },
      })

      if (error) {
        throw error
      }

      return reply.code(200).send({ images: data })
    } catch (error) {
      logger.error('Error fetching images:', error)
      return reply.code(500).send({ error: 'Error fetching images' })
    }
  })

  server.get('/search', async (req, reply) => {
    const image = await req.file()

    if (!image) {
      return reply.code(400).send({ error: 'No image uploaded' })
    }

    try {
      // Generate embedding for the uploaded image
      const queryEmbeddings = await HominemVectorStore.getImageEmbedding(image)

      // Get collection
      const collection = await HominemVectorStore.getDocumentCollection(IMAGE_COLLECTION)

      // Perform similarity search
      const queryResults = await collection.query({
        queryEmbeddings,
        nResults: 6,
      })

      // Format results to match expected output
      const results = queryResults.metadatas[0].map((metadata, index) => ({
        id: queryResults.ids[0][index],
        metadata,
        score: queryResults.distances ? queryResults.distances[0][index] : null,
      }))

      return reply.code(200).send({ results })
    } catch (error) {
      logger.error('Error in image search:', error)
      return reply.code(500).send({ error: 'Error searching images' })
    }
  })

  server.delete('/:imageId', async (req, reply) => {
    const { imageId } = req.params as { imageId: string }

    if (!imageId) {
      return reply.code(400).send({ error: 'Image ID is required' })
    }

    try {
      // Delete from Supabase
      const { data: photoData, error: fetchError } = await supabaseClient
        .from('photos')
        .select('storage_path')
        .eq('id', imageId)
        .single()

      if (fetchError || !photoData) {
        return reply.code(404).send({ error: 'Image not found' })
      }

      await Promise.all([
        // Delete from database
        supabaseClient
          .from('photos')
          .delete()
          .eq('id', imageId),

        // Delete from storage
        supabaseClient.storage
          .from('photos')
          .remove([photoData.storage_path]),

        // Delete from vector store
        HominemVectorStore.getDocumentCollection(IMAGE_COLLECTION).then((collection) =>
          collection.delete({
            ids: [imageId],
          })
        ),
      ])

      return reply.code(200).send({ message: 'Image deleted successfully' })
    } catch (error) {
      logger.error('Error deleting image:', error)
      return reply.code(500).send({ error: 'Error deleting image' })
    }
  })
}

export default fp(imagePlugin)

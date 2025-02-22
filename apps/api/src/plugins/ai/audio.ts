import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import fs from 'node:fs'
import { openaiClient } from '../../lib/openai.js'
import { supabaseClient } from '../../lib/supabase.js'

const audioPlugin: FastifyPluginAsync = async (server) => {
  server.post('/upload-audio', async (request, reply) => {
    const data = await request.file()
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' })
    }

    try {
      const buffer = await data.toBuffer()
      const fileStream = fs.createReadStream(buffer)
      const [transcription, uploadResponse] = await Promise.all([
        openaiClient.audio.transcriptions.create({
          file: fileStream,
          model: 'whisper-1',
          response_format: 'text',
        }),
        supabaseClient.storage.from('audio').upload(`${Date.now()}-${data.filename}`, fileStream),
      ])

      const { data: uploadData, error: uploadError } = uploadResponse

      if (uploadError) {
        return reply.code(500).send({ error: 'Failed to upload audio' })
      }

      const { data: insertData, error: insertError } = await supabaseClient
        .from('audio_transcriptions')
        .insert({
          filename: data.filename,
          storage_path: uploadData.path,
          transcription,
        })

      if (insertError) {
        return reply.code(500).send({ error: 'Failed to store audio transcription' })
      }

      return reply.send({
        message: 'Audio uploaded and transcribed successfully',
        data: insertData,
      })
    } catch (error) {
      console.error('Error uploading audio:', error)
      return reply.code(500).send({ error: 'Failed to upload audio' })
    }
  })
}

export default fp(audioPlugin)

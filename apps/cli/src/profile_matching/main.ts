import { logger } from '@ponti/utils/logger'

const dotenv = require('dotenv')

dotenv.config()

const fetch_embeddings = require('./fetch_embeddings')
const { query, upsertProfile } = require('./vector_db')
const crypto = require('node:crypto')

const fs = require('fs-extra')

const user_profiles = fs.readJsonSync('profiles.json')

interface User {
  id: string
  description: string
}
async function setProfile(user: User) {
  const embeddings = await fetch_embeddings(user.description)

  // In case of security concerns of sending SY user ids to Pinecone, we can hash the ids
  const hashed_id = crypto.createHash('md5').update(user.id).digest('hex')

  return await upsertProfile(hashed_id, embeddings)
}

async function findMatches(user: User) {
  const embeddings = await fetch_embeddings(user.description)

  return await query(embeddings, 5)
}

async function upload_everything() {
  for (let i = 0; i < user_profiles.length; i += 5) {
    logger.info(`Inserting profiles ${i} to ${i + 5}`)
    await Promise.all(user_profiles.slice(i, i + 5).map(setProfile))
  }
}

async function demo(i: number) {
  try {
    logger.info('Inserting profile')
    await setProfile(user_profiles[i])

    logger.info('Finding matches')
    const matches = await findMatches(user_profiles[i])

    logger.info(matches)
  } catch (error) {
    logger.info(error)
  }
}

demo(4)

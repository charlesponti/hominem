import { createClient } from '../supabase/client'

export class ClientFileStorage {
  private supabase = createClient()
  private bucketName: string

  constructor(bucketName = 'chat-files') {
    this.bucketName = bucketName
  }

  async uploadFile(file: File, userId: string) {
    const filename = `${userId}/${Date.now()}-${file.name}`

    const { data, error } = await this.supabase.storage.from(this.bucketName).upload(filename, file)

    if (error) throw error
    return data
  }

  async getFileUrl(path: string) {
    const { data } = this.supabase.storage.from(this.bucketName).getPublicUrl(path)

    return data.publicUrl
  }
}

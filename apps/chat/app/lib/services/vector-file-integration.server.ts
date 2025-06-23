import type { ProcessedFile } from '../types/upload.js'
import { HominemVectorStore } from './vector.server'

/**
 * Automatically index processed files into the vector store
 */
export async function indexProcessedFile(
  processedFile: ProcessedFile,
  userId: string,
  fileUrl?: string
): Promise<{ success: boolean; vectorIds: string[] }> {
  try {
    const vectorIds: string[] = []

    // Only index files that have extractable text content
    if (!processedFile.textContent && !processedFile.content) {
      return { success: true, vectorIds: [] }
    }

    const content = processedFile.textContent || processedFile.content || ''

    // Prepare metadata
    const metadata = {
      fileId: processedFile.id,
      originalName: processedFile.originalName,
      fileType: processedFile.type,
      mimetype: processedFile.mimetype,
      fileSize: processedFile.size,
      ...(processedFile.metadata || {}),
    }

    const options = {
      title: processedFile.originalName,
      source: fileUrl || processedFile.id,
      sourceType: 'file',
    }

    // For large documents, use chunking
    if (content.length > 1000) {
      const result = await HominemVectorStore.addDocumentWithChunking(
        content,
        userId,
        metadata,
        options
      )
      vectorIds.push(...result.ids)
    } else {
      // For smaller documents, add as single entry
      const result = await HominemVectorStore.addDocument(content, userId, metadata, options)
      if (result.success) {
        vectorIds.push(result.id)
      }
    }

    return {
      success: vectorIds.length > 0,
      vectorIds,
    }
  } catch (error) {
    console.error('Error indexing processed file:', error)
    return {
      success: false,
      vectorIds: [],
    }
  }
}

/**
 * Remove file from vector store when file is deleted
 */
export async function removeFileFromVectorStore(
  fileId: string,
  userId: string
): Promise<{ success: boolean; removedCount: number }> {
  try {
    // Get all vector documents for this file
    const userDocs = await HominemVectorStore.getUserDocuments(userId, 1000)
    const fileDocs = userDocs.filter((doc) => {
      try {
        const metadata = JSON.parse(doc.metadata || '{}')
        return metadata.fileId === fileId
      } catch {
        return false
      }
    })

    let removedCount = 0

    // Delete each vector document
    for (const doc of fileDocs) {
      const result = await HominemVectorStore.deleteDocument(doc.id, userId)
      if (result.success) {
        removedCount++
      }
    }

    return {
      success: true,
      removedCount,
    }
  } catch (error) {
    console.error('Error removing file from vector store:', error)
    return {
      success: false,
      removedCount: 0,
    }
  }
}

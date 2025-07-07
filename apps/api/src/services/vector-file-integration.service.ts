import type { ProcessedFile } from './file-processor.service.js'
import { VectorService } from './vector.service.js'

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
      const result = await VectorService.ingestMarkdown(content, userId, metadata)
      // Note: ingestMarkdown returns chunksProcessed, but we need to get the actual IDs
      // This is a limitation of the current API - we'd need to modify the vector service
      // to return the actual document IDs
      vectorIds.push(`chunked-${processedFile.id}`)
    } else {
      // For smaller documents, add as single entry
      const result = await VectorService.ingestMarkdown(content, userId, metadata)
      if (result.success) {
        vectorIds.push(processedFile.id)
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

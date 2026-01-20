import type { ProcessedFile } from './file-processor.service';

import { VectorService } from './vector.service';

export async function indexProcessedFile(
  processedFile: ProcessedFile,
  userId: string,
): Promise<{ success: boolean; vectorIds: string[] }> {
  try {
    const vectorIds: string[] = [];

    if (!(processedFile.textContent || processedFile.content)) {
      return { success: true, vectorIds: [] };
    }

    const content = processedFile.textContent || processedFile.content || '';

    const metadata = {
      fileId: processedFile.id,
      originalName: processedFile.originalName,
      fileType: processedFile.type,
      mimetype: processedFile.mimetype,
      fileSize: processedFile.size,
      ...(processedFile.metadata || {}),
    };

    if (content.length > 1000) {
      await VectorService.ingestMarkdown(content, userId, metadata);
      vectorIds.push(`chunked-${processedFile.id}`);
    } else {
      const result = await VectorService.ingestMarkdown(content, userId, metadata);
      if (result.success) {
        vectorIds.push(processedFile.id);
      }
    }

    return {
      success: vectorIds.length > 0,
      vectorIds,
    };
  } catch (error) {
    console.error('Error indexing processed file:', error);
    return {
      success: false,
      vectorIds: [],
    };
  }
}

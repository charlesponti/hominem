import csv from 'csv-parser'
import fs from 'node:fs'
import { HominemVectorStore } from '../lib/chromadb'

export class CSVProcessor {
  async processCSV(filePath: string, indexName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const records: Record<string, any>[] = []

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (record) => records.push(record))
        .on('error', (error) => reject(error))
        .on('end', async () => {
          try {
            const batchSize = 100
            let processedCount = 0

            for (let i = 0; i < records.length; i += batchSize) {
              const batch = records.slice(i, i + batchSize)
              const documents = batch.map((record) => {
                const textData = Object.values(record).join(' ')
                processedCount++
                return {
                  id: record.id || crypto.randomUUID(),
                  document: textData,
                  metadata: record,
                }
              })

              await HominemVectorStore.upsertBatch(indexName, documents)
            }

            resolve(records.length)
          } catch (error) {
            reject(error)
          }
        })
    })
  }
}

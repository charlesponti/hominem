'use client'

import { useFileInput } from '@/hooks/use-file-input'
import { useImportFiles } from '@/hooks/use-import-files'
import { useInterval } from '@/hooks/use-interval'
import type { FileStatus } from '@ponti/utils/types'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, X as XIcon } from 'lucide-react'
import React, { useState } from 'react'

export default function ImportPage() {
  const { files, handleFileChange } = useFileInput()
  const { statuses, importFiles, updateStatus, getActiveImports, checkJobStatus } = useImportFiles()
  const [importStarted, setImportStarted] = useState(false)
  const [jobIds, setJobIds] = useState<string[]>([])

  // Poll for updates every second
  useInterval(
    async () => {
      if (jobIds.length === 0) return

      try {
        // Fetch active imports using the updated API
        const activeImports = await getActiveImports()

        if (!activeImports || activeImports.length === 0) {
          return
        }

        // Update statuses for each active job
        for (const jobId of jobIds) {
          const job = activeImports.find((j) => j.jobId === jobId)

          if (job) {
            const file = files.find((f) => f.name === job.fileName)
            if (file) {
              // Calculate processing time in seconds
              const processingTime = job.endTime
                ? (job.endTime - job.startTime) / 1000
                : (Date.now() - job.startTime) / 1000

              // Update file status with latest information
              updateStatus(file, {
                status: job.status,
                stats: {
                  ...job.stats,
                  processingTime,
                },
                error: job.error,
              })
            }
          } else {
            // If job is not found in active imports, check individual status
            try {
              const jobStatus = await checkJobStatus(jobId)

              // Update file status if found
              const file = files.find((f) => jobStatus.fileName === f.name)
              if (file) {
                updateStatus(file, {
                  status: jobStatus.status,
                  stats: jobStatus.stats,
                  error: jobStatus.error,
                })
              }
            } catch (err) {
              console.error(err)
              console.warn(`Job ${jobId} not found, may have completed`)
            }
          }
        }

        // Stop polling if all jobs are complete or errored
        if (
          activeImports.every(
            (job) => jobIds.includes(job.jobId) && (job.status === 'done' || job.status === 'error')
          )
        ) {
          // Add small delay to show final stats before stopping
          setTimeout(() => setJobIds([]), 2000)
        }
      } catch (error) {
        console.error('Failed to fetch import status:', error)
      }
    },
    jobIds.length > 0 ? 1000 : null // Poll every second when jobs are active
  )

  const handleImport = async () => {
    setImportStarted(true)
    try {
      const results = await importFiles(files)
      setJobIds(results.map((r) => r.jobId))
    } catch (error) {
      console.error('Failed to start import:', error)
      setImportStarted(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      {/* Shadcn styled file input */}
      <div className="w-full max-w-md p-8 border-2 border-dashed rounded-lg">
        <label
          htmlFor="file-upload"
          className="block text-center text-lg cursor-pointer text-gray-700"
        >
          Drag &amp; drop CSV files here, or click to select
        </label>
        <input
          id="file-upload"
          type="file"
          multiple
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      {/* Show Import button if files are selected and not yet imported */}
      {!importStarted && files.length > 0 && (
        <button
          type="button"
          onClick={handleImport}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Start Import
        </button>
      )}
      <AnimatePresence>
        {files.length > 0 ? (
          <motion.div
            className="mt-8 w-full max-w-md space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <h2 className="text-md text-gray-400 font-bold">Processing Status:</h2>
            <ul>
              {files.map((file) => (
                <motion.li
                  key={file.name}
                  className="p-2 border rounded mb-2 flex items-center"
                  initial={{ x: -100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 100, opacity: 0 }}
                >
                  <span>{file.name}</span>
                  <div className="ml-auto">
                    <FileUploadStatus uploadStatus={statuses.find((s) => s.file === file)} />
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function FileUploadStatus({ uploadStatus }: { uploadStatus?: FileStatus }) {
  if (!uploadStatus) return null
  const { status, error, stats } = uploadStatus

  if (status === 'uploading' || status === 'processing') {
    return <Processing progress={stats?.progress} />
  }

  if (status === 'done') {
    return (
      <div className="flex flex-col">
        <span className="text-green-500 flex items-center">
          <Check size={16} className="w-4 h-4 mr-1" />
          Done
        </span>
        {stats && <ProcessingStats stats={stats} />}
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col">
        <span className="text-red-500 flex items-center">
          <XIcon className="w-4 h-4 mr-1" />
          Error: {error}
        </span>
      </div>
    )
  }

  return <span>{status}</span>
}

// Processing animation with optional progress
function Processing({ progress }: { progress?: number }) {
  return (
    <div className="flex items-center">
      <div className="loading-spinner loading h-8" />
      <div className="flex flex-col">
        <span className="text-blue-500">
          Processing {progress !== undefined ? `(${Math.round(progress)}%)` : ''}
        </span>

        {/* Progress bar */}
        {progress !== undefined && (
          <div className="w-24 h-1.5 mt-1 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Display detailed processing statistics
function ProcessingStats({ stats }: { stats: FileStatus['stats'] }) {
  if (!stats || typeof stats !== 'object') return null

  return (
    <div className="text-xs mt-1 space-y-1 text-gray-600">
      {stats.processingTime !== undefined ? (
        <div>Time: {stats.processingTime.toFixed(1)}s</div>
      ) : null}
      {stats.total !== undefined ? (
        <div className="grid grid-cols-2 gap-x-2">
          <div>Total: {stats.total}</div>
          <div>Created: {stats.created || 0}</div>
          <div>Updated: {stats.updated || 0}</div>
          <div>Skipped: {stats.skipped || 0}</div>
          {stats.merged !== undefined && <div>Merged: {stats.merged}</div>}
          {stats.invalid !== undefined && stats.invalid > 0 && (
            <div className="text-amber-600">Invalid: {stats.invalid}</div>
          )}
        </div>
      ) : null}
      {stats.errors?.length && stats.errors.length > 0 ? (
        <div className="text-red-500">Errors: {stats.errors.length}</div>
      ) : null}
    </div>
  )
}

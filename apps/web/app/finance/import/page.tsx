'use client'

import { useFileInput } from '@/hooks/use-file-input'
import { useImportFiles, type FileStatus } from '@/hooks/use-import-transactions'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, X as XIcon } from 'lucide-react'
import React, { useState } from 'react'

export default function ImportPage() {
  const { files, handleFileChange } = useFileInput()
  const { statuses, importFiles } = useImportFiles()
  const [importStarted, setImportStarted] = useState(false)

  const handleImport = async () => {
    setImportStarted(true)
    await importFiles(files)
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
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          duration: 1,
          ease: 'linear',
        }}
        className="mr-2"
      >
        <svg
          className="w-5 h-5 text-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <title>Processing</title>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v16h16" />
        </svg>
      </motion.div>
      <span className="text-blue-500">
        Processing {progress !== undefined ? `(${Math.round(progress)}%)` : ''}
      </span>
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

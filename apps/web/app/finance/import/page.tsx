'use client'

import { DropZone } from '@/components/drop-zone'
import { FileUploadStatus } from '@/components/file-upload-status'
import { FileUploadStatusBadge } from '@/components/file-upload-status-badge'
import { Button } from '@/components/ui/button'
import { useFileInput } from '@/hooks/use-file-input'
import { useImportTransactions } from '@/hooks/use-import-transactions'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { FileStatus } from '@hominem/utils/types'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'

function getStructuredStatuses(statuses: FileStatus[]) {
  return statuses.reduce(
    (acc, status) => {
      if (status.status === 'processing' || status.status === 'uploading') {
        acc.processingFiles.push(status)
      } else if (status.status === 'queued') {
        acc.queuedFiles.push(status)
      } else if (status.status === 'done' || status.status === 'error') {
        acc.completedFiles.push(status)
      }
      return acc
    },
    {
      processingFiles: [] as typeof statuses,
      queuedFiles: [] as typeof statuses,
      completedFiles: [] as typeof statuses,
    }
  )
}

export default function TransactionImportPage() {
  const { files, handleFileChange } = useFileInput()
  const { isConnected, statuses, startImport, activeJobIds } = useImportTransactions()
  const { toast } = useToast()
  const [isImporting, setIsImporting] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const filteredFiles = files.filter(
    (file) => !statuses.some((status) => status.file.name === file.name)
  )

  // Separate status entries into different categories for better UI representation
  const { processingFiles, queuedFiles, completedFiles } = useMemo(
    () => getStructuredStatuses(statuses),
    [statuses]
  )

  useEffect(() => {
    // Reset import state when all jobs are complete
    if (isImporting && activeJobIds.length === 0) {
      setIsImporting(false)
      if (files.length > 0) {
        toast({
          title: 'Import completed',
          description: `Successfully processed ${files.length} file(s)`,
          variant: 'default',
        })
      }
    }
  }, [activeJobIds.length, isImporting, files.length, toast])

  const handleImport = async () => {
    if (!files.length) return

    setIsImporting(true)
    try {
      await startImport(files)
      toast({
        title: 'Import started',
        description: `Processing ${files.length} file(s)`,
      })
    } catch (error) {
      setIsImporting(false)
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      {/* Connection status indicator */}

      <div
        className={cn(
          'w-full max-w-2xl mx-auto p-8 space-y-6',
          'transition-all duration-500 ease-in-out'
        )}
        aria-label="File import interface"
      >
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-2xl font-bold text-gray-900">Import Transactions</h1>
          <p className="text-gray-500">Drag and drop your CSV files or click to browse</p>
        </motion.div>

        {/* File upload area */}
        <motion.div
          className="w-full flex justify-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
            delay: 0.1,
          }}
        >
          <DropZone
            isImporting={isImporting}
            dragActive={dragActive}
            className={cn(
              'transition-all duration-300',
              dragActive && 'scale-[1.02] border-blue-400'
            )}
            onDrop={(files: File[]) => {
              if (files.length) {
                handleFileChange(files)
              } else {
                toast({
                  title: 'Invalid files',
                  description: 'Please select only CSV files',
                  variant: 'destructive',
                })
              }
            }}
            onDragOver={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
            onChange={handleFileChange}
            accept=".csv"
            multiple={true}
          />
        </motion.div>

        {/* Import progress indicators */}
        <div className="space-y-3">
          {activeJobIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <output className="block w-full text-sm font-medium bg-blue-50 text-blue-700 p-3 rounded-md">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                  Processing {activeJobIds.length} active import{activeJobIds.length > 1 ? 's' : ''}
                </div>
              </output>
            </motion.div>
          )}

          {queuedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <output className="block w-full text-sm font-medium bg-amber-50 text-amber-700 p-3 rounded-md">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-amber-500 rounded-full" />
                  {queuedFiles.length} file{queuedFiles.length > 1 ? 's' : ''} queued for processing
                </div>
              </output>
            </motion.div>
          )}
        </div>

        {/* Import button with loading state */}
        {files.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              type="button"
              onClick={handleImport}
              className={cn(
                'w-full h-12 text-base font-medium transition-all duration-200',
                'bg-gradient-to-r from-blue-600 to-indigo-600',
                'hover:from-blue-700 hover:to-indigo-700',
                'disabled:from-gray-400 disabled:to-gray-400'
              )}
              disabled={!isConnected || isImporting || !files.length}
              aria-busy={isImporting}
            >
              {isImporting ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Importing...</span>
                </div>
              ) : isConnected ? (
                <span>Start Import</span>
              ) : (
                <span>Connecting...</span>
              )}
            </Button>
          </motion.div>
        ) : null}

        <AnimatePresence>
          {/* Display queued files if any exist */}
          {queuedFiles.length > 0 && (
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h2 className="text-lg font-semibold text-amber-700">Queued Files</h2>
              <ul className="space-y-3">
                {queuedFiles.map((status, index) => (
                  <FileImport
                    key={`queued-${status.file.name || index}`}
                    fileName={status.file.name}
                    status={status}
                  />
                ))}
              </ul>
            </motion.div>
          )}

          {/* Display processing files if any exist */}
          {processingFiles.length > 0 && (
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h2 className="text-lg font-semibold text-blue-700">Processing</h2>
              <ul className="space-y-3">
                {processingFiles.map((status, index) => (
                  <FileImport
                    key={`processing-${status.file.name || index}`}
                    fileName={status.file.name}
                    status={status}
                  />
                ))}
              </ul>
            </motion.div>
          )}

          {/* Display completed files if any exist */}
          {completedFiles.length > 0 && (
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h2 className="text-lg font-semibold text-gray-700">Completed</h2>
              <ul className="space-y-3">
                {completedFiles.map((status, index) => (
                  <FileImport
                    key={`completed-${status.file.name || index}`}
                    fileName={status.file.name}
                    status={status}
                  />
                ))}
              </ul>
            </motion.div>
          )}

          {/* Display selected files that haven't been imported yet */}
          {filteredFiles.length > 0 && (
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h2 className="text-lg font-semibold text-gray-700">Selected Files</h2>
              <ul className="space-y-3">
                {filteredFiles.map((file, index) => (
                  <FileImport
                    key={`file-${file.name || index}`}
                    fileName={file.name}
                    status={statuses.find((s) => s.file.name === file.name)}
                  />
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function FileImport({ fileName, status }: { fileName: string; status?: FileStatus }) {
  return (
    <motion.li
      className={cn(
        'p-4 rounded-lg',
        'bg-white/50 backdrop-blur-sm',
        'border border-gray-200/50',
        'shadow-sm hover:shadow-md',
        'transition-all duration-200 ease-in-out'
      )}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
      }}
    >
      <div className="flex flex-col justify-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate flex-1">{fileName}</span>
          <FileUploadStatusBadge status={status?.status} />
        </div>
        {status ? <FileUploadStatus uploadStatus={status} /> : null}
      </div>
    </motion.li>
  )
}

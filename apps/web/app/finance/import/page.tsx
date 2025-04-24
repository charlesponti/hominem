'use client'

import { DropZone } from '@/components/drop-zone'
import { FileUploadStatus } from '@/components/file-upload-status'
import { FileUploadStatusBadge } from '@/components/file-upload-status-badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useFileInput } from '@/lib/hooks/use-file-input'
import { useImportTransactionsStore } from '@/lib/hooks/use-import-transactions-store'
import { useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { FileStatus } from '@hominem/utils/types'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'

type FileCategories = {
  processingFiles: FileStatus[]
  queuedFiles: FileStatus[]
  completedFiles: FileStatus[]
}

function getStructuredStatuses(statuses: FileStatus[]): FileCategories {
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
      processingFiles: [] as FileStatus[],
      queuedFiles: [] as FileStatus[],
      completedFiles: [] as FileStatus[],
    }
  )
}

export default function TransactionImportPage() {
  const { files, handleFileChange, resetFiles } = useFileInput()
  const {
    isConnected,
    statuses,
    startImport,
    activeJobIds,
    isImporting: isImportInProgress,
    isError,
    error,
    reset: resetImport,
  } = useImportTransactionsStore()
  const { toast } = useToast()
  const [dragActive, setDragActive] = useState(false)

  // Filter out files that are already being processed
  const filteredFiles = useMemo(
    () => files.filter((file) => !statuses.some((status) => status.file.name === file.name)),
    [files, statuses]
  )

  // Separate status entries into different categories for better UI representation
  const { processingFiles, queuedFiles, completedFiles } = useMemo(
    () => getStructuredStatuses(statuses),
    [statuses]
  )

  // Handle drag events
  const handleDragOver = useCallback(() => setDragActive(true), [])
  const handleDragLeave = useCallback(() => setDragActive(false), [])

  // Handle file drop
  const handleDrop = useCallback(
    (files: File[]) => {
      if (files.length) {
        handleFileChange(files)
      } else {
        toast({
          title: 'Invalid files',
          description: 'Please select only CSV files',
          variant: 'destructive',
        })
      }
      setDragActive(false)
    },
    [handleFileChange, toast]
  )

  // Handle import completion
  useEffect(() => {
    if (isImportInProgress && activeJobIds.length === 0 && completedFiles.length > 0) {
      // Only show completion toast if we had files that completed processing
      toast({
        title: 'Import completed',
        description: `Successfully processed ${completedFiles.length} file(s)`,
        variant: 'default',
      })
    }
  }, [activeJobIds.length, isImportInProgress, completedFiles.length, toast])

  // Handle import start
  const handleImport = async () => {
    if (!filteredFiles.length) return

    try {
      await startImport(filteredFiles)
      toast({
        title: 'Import started',
        description: `Processing ${filteredFiles.length} file(s)`,
      })
    } catch (err) {
      toast({
        title: 'Import failed',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      })
    }
  }

  // Reset all import state
  const handleReset = () => {
    resetFiles()
    resetImport()
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
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

        {/* Connection status indicator */}
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Alert>
              <AlertDescription>Connecting to server... Please wait.</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Error display */}
        {isError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Alert variant="destructive">
              <AlertDescription>
                {error?.message || 'An error occurred during import'}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

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
            isImporting={isImportInProgress}
            dragActive={dragActive}
            className={cn(
              'transition-all duration-300',
              dragActive && 'scale-[1.02] border-blue-400'
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
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
              <div className="block w-full text-sm font-medium bg-blue-50 text-blue-700 p-3 rounded-md">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                  Processing {activeJobIds.length} active import{activeJobIds.length > 1 ? 's' : ''}
                </div>
              </div>
            </motion.div>
          )}

          {queuedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="block w-full text-sm font-medium bg-amber-50 text-amber-700 p-3 rounded-md">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-amber-500 rounded-full" />
                  {queuedFiles.length} file{queuedFiles.length > 1 ? 's' : ''} queued for processing
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Action buttons */}
        <motion.div
          className="flex gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {filteredFiles.length > 0 && (
            <Button
              type="button"
              onClick={handleImport}
              className={cn(
                'flex-1 h-12 text-base font-medium transition-all duration-200',
                'bg-gradient-to-r from-blue-600 to-indigo-600',
                'hover:from-blue-700 hover:to-indigo-700',
                'disabled:from-gray-400 disabled:to-gray-400'
              )}
              disabled={!isConnected || isImportInProgress || !filteredFiles.length}
              aria-busy={isImportInProgress}
            >
              {isImportInProgress ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Importing...</span>
                </div>
              ) : (
                <span>Start Import</span>
              )}
            </Button>
          )}

          {(statuses.length > 0 || files.length > 0) && (
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="h-12 text-base font-medium"
              disabled={isImportInProgress}
            >
              Reset
            </Button>
          )}
        </motion.div>

        <AnimatePresence>
          {/* Display selected files that haven't been imported yet */}
          {filteredFiles.length > 0 && (
            <FileStatusSection
              title="Selected Files"
              files={filteredFiles.map((file) => ({
                fileName: file.name,
                status: undefined,
              }))}
            />
          )}

          {/* Display queued files if any exist */}
          {queuedFiles.length > 0 && (
            <FileStatusSection
              title="Queued Files"
              titleClass="text-amber-700"
              files={queuedFiles.map((status) => ({
                fileName: status.file.name,
                status,
              }))}
            />
          )}

          {/* Display processing files if any exist */}
          {processingFiles.length > 0 && (
            <FileStatusSection
              title="Processing"
              titleClass="text-blue-700"
              files={processingFiles.map((status) => ({
                fileName: status.file.name,
                status,
              }))}
            />
          )}

          {/* Display completed files if any exist */}
          {completedFiles.length > 0 && (
            <FileStatusSection
              title="Completed"
              files={completedFiles.map((status) => ({
                fileName: status.file.name,
                status,
              }))}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

type FileImportProps = {
  fileName: string
  status?: FileStatus
}

function FileImport({ fileName, status }: FileImportProps) {
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

type FileStatusSectionProps = {
  title: string
  titleClass?: string
  files: FileImportProps[]
}

function FileStatusSection({ title, titleClass, files }: FileStatusSectionProps) {
  if (!files.length) return null

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className={cn('text-lg font-semibold', titleClass || 'text-gray-700')}>{title}</h2>
      <ul className="space-y-3">
        {files.map((file, index) => (
          <FileImport
            key={`${title}-${file.fileName || index}`}
            fileName={file.fileName}
            status={file.status}
          />
        ))}
      </ul>
    </motion.div>
  )
}

'use client'

import { ProgressBar } from '@/components/progress-bar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useFileInput } from '@/hooks/use-file-input'
import { useToast } from '@/hooks/use-toast'
import { useWebSocketImports } from '@/hooks/use-websocket-imports'
import type { FileStatus } from '@ponti/utils/types'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Wifi, WifiOff, X as XIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { DropZone } from '../../../components/drop-zone'

export default function SocketImportPage() {
  const { files, handleFileChange } = useFileInput()
  const { isConnected, statuses, startImport, activeJobIds } = useWebSocketImports()
  const { toast } = useToast()
  const [isImporting, setIsImporting] = useState(false)
  const [dragActive, setDragActive] = useState(false)

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
    <div className="flex flex-col items-center justify-center min-h-screen p-4 relative">
      {/* Connection status indicator */}
      <div className="fixed top-4 right-4">
        {isConnected ? (
          <Badge variant="outline" className="flex items-center gap-1 bg-green-50">
            <Wifi className="h-3 w-3 text-green-600" aria-hidden="true" />
            <span className="text-green-600">Connected</span>
          </Badge>
        ) : (
          <Badge variant="outline" className="flex items-center gap-1 bg-red-50">
            <WifiOff className="h-3 w-3 text-red-600" aria-hidden="true" />
            <span className="text-red-600">Disconnected</span>
          </Badge>
        )}
      </div>

      <Card className="w-full max-w-2xl p-8 space-y-6" aria-label="File import interface">
        {/* File upload area */}
        <div>
          <DropZone
            isImporting={isImporting}
            dragActive={dragActive}
            onDrop={(files: File[]) => {
              if (files.length) {
                const dataTransfer = new DataTransfer()
                for (const file of files) {
                  dataTransfer.items.add(file)
                }
                handleFileChange({
                  target: { files: dataTransfer.files },
                  currentTarget: { files: dataTransfer.files },
                  type: 'change',
                  nativeEvent: new Event('change', { bubbles: true }),
                } as React.ChangeEvent<HTMLInputElement>)
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
            onClick={() => document.getElementById('file-upload')?.click()}
          />
          <input
            id="file-upload"
            type="file"
            multiple
            accept=".csv"
            onChange={handleFileChange}
            className="sr-only"
            disabled={isImporting}
            aria-label="File input for CSV files"
          />
        </div>

        {/* Active imports indicator */}
        {activeJobIds.length > 0 && (
          <output className="w-full text-sm text-primary font-medium">
            Processing {activeJobIds.length} active import{activeJobIds.length > 1 ? 's' : ''}
          </output>
        )}

        {/* Import button with loading state */}
        <Button
          type="button"
          onClick={handleImport}
          className="w-full"
          disabled={!isConnected || isImporting || !files.length}
          aria-busy={isImporting}
        >
          {isImporting ? 'Importing...' : isConnected ? 'Start Import' : 'Connecting...'}
        </Button>

        {/* Status list */}
        <AnimatePresence>
          {statuses.map((status) => (
            <motion.div
              key={status.file.name}
              className="p-4 border rounded-lg bg-gray-50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium truncate">{status.file.name}</span>
              </div>
              <FileUploadStatus uploadStatus={status} />
            </motion.div>
          ))}
          {files.length > 0 && (
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h2 className="text-lg font-semibold text-gray-700">Upload Status</h2>
              <ul className="space-y-3">
                {files.map((file) => (
                  <motion.li
                    key={file.name}
                    className="p-4 border rounded-lg bg-gray-50"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex flex-col justify-center gap-2 mb-2">
                      <span className="font-medium truncate">{file.name}</span>
                      <FileUploadStatus uploadStatus={statuses.find((s) => s.file === file)} />
                    </div>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  )
}

function FileUploadStatus({ uploadStatus }: { uploadStatus?: FileStatus }) {
  if (!uploadStatus) return null
  const { status, error, stats } = uploadStatus

  if (status === 'uploading' || status === 'processing') {
    const progress = stats?.progress

    return (
      <output className="w-full flex flex-col justify-center">
        <span className="text-blue-500 text-sm text-right">
          Processing {progress !== undefined ? `(${Math.round(progress)}%)` : ''}
        </span>
        <ProgressBar progress={progress} />
      </output>
    )
  }

  if (status === 'done') {
    return (
      <output className="flex flex-col">
        <ProgressBar progress={100} />
        {stats && <ProcessingStats stats={stats} />}
      </output>
    )
  }

  if (status === 'error') {
    return (
      <output className="flex flex-col" role="alert">
        <span className="text-red-500 flex items-center">
          <XIcon className="w-4 h-4 mr-1" aria-hidden="true" />
          Error: {error}
        </span>
      </output>
    )
  }

  return <output>{status}</output>
}

function ProcessingStats({ stats }: { stats: FileStatus['stats'] }) {
  if (!stats || typeof stats !== 'object') return null

  return (
    <dl className="text-xs mt-1 space-y-1 text-gray-600">
      {stats.processingTime !== undefined ? (
        <>
          <dt className="sr-only">Processing time</dt>
          <dd>Time: {(stats.processingTime / 1000).toFixed(1)}s</dd>
        </>
      ) : null}
      {stats.total !== undefined && Object.values(stats).length ? (
        <div className="grid grid-cols-2 gap-x-2">
          <ProcessingStat label="Total" value={stats.total} />
          <ProcessingStat label="Created" value={stats.created} />
          <ProcessingStat label="Updated" value={stats.updated} />
          <ProcessingStat label="Skipped" value={stats.skipped} />
          <ProcessingStat label="Merged" value={stats.merged} />
          <ProcessingStat label="Invalid" value={stats.invalid} />
        </div>
      ) : null}

      {stats.errors?.length && stats.errors.length > 0 ? (
        <div>
          <dt className="sr-only">Error count</dt>
          <dd className="text-red-500">Errors: {stats.errors.length}</dd>
        </div>
      ) : null}
    </dl>
  )
}

function ProcessingStat({ label, value }: { label: string; value?: number }) {
  if (value === undefined) return null
  return (
    <div className="flex items-center justify-between">
      <dt className="sr-only">{label}</dt>
      <dd className="text-primary text-xs">
        {label}: {value}
      </dd>
    </div>
  )
}

import type { FileStatus } from '@hominem/utils/types'
import { motion } from 'framer-motion'
import { XIcon } from 'lucide-react'
import { memo } from 'react'
import { ProgressBar } from '~/components/progress-bar'
import { cn } from '~/lib/utils'

export const FileUploadStatus = memo(function FileUploadStatus({
  uploadStatus,
}: { uploadStatus?: FileStatus }) {
  if (!uploadStatus) return null
  const { status, error, stats } = uploadStatus

  if (status === 'uploading' || status === 'processing') {
    const progress = stats?.progress

    return (
      <output className="w-full">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm text-gray-500 font-medium">
            {status === 'uploading' ? 'Uploading' : 'Processing'}
          </span>
          <span className="text-sm font-medium text-blue-600">
            {progress !== undefined ? `${Math.round(progress)}%` : ''}
          </span>
        </div>
        <div className="w-full">
          {typeof progress === 'number' ? (
            <ProgressBar
              progress={progress}
              className={cn(
                'h-2 bg-blue-100',
                'before:bg-gradient-to-r before:from-blue-500 before:to-indigo-500'
              )}
              aria-label={`${Math.round(progress)}% complete`}
            />
          ) : (
            <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 animate-progress-indeterminate" />
            </div>
          )}
        </div>
      </output>
    )
  }

  if (status === 'queued') {
    return (
      <output className="w-full">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm text-gray-500 font-medium">Queue position</span>
        </div>
        <div className="w-full">
          <ProgressBar
            progress={0}
            className="h-2 bg-amber-100 before:bg-gradient-to-r before:from-amber-500 before:to-orange-500"
          />
        </div>
      </output>
    )
  }

  if (status === 'done') {
    return (
      <output className="space-y-3">
        <div className="w-full">
          <ProgressBar
            progress={100}
            className="h-2 bg-green-100 before:bg-gradient-to-r before:from-green-500 before:to-emerald-500"
          />
        </div>
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <ProcessingStats stats={stats} />
          </motion.div>
        )}
      </output>
    )
  }

  if (status === 'error') {
    return (
      <output className="mt-2" role="alert">
        <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 text-red-700">
          <XIcon className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span className="text-sm">{error}</span>
        </div>
      </output>
    )
  }

  return <output className="text-sm text-gray-500">{status}</output>
})

const ProcessingStats = memo(function ProcessingStats({ stats }: { stats: FileStatus['stats'] }) {
  if (!stats || typeof stats !== 'object') return null

  return (
    <dl className="mt-3 divide-y divide-gray-100">
      {stats.processingTime !== undefined && (
        <div className="py-2 first:pt-0 last:pb-0">
          <dt className="sr-only">Processing time</dt>
          <dd className="text-sm text-gray-900 font-medium">
            Completed in {(stats.processingTime / 1000).toFixed(1)}s
          </dd>
        </div>
      )}
      {stats.total !== undefined && Object.values(stats).length ? (
        <div className="py-2">
          <div className="grid grid-cols-2 gap-4">
            <ProcessingStat label="Total" value={stats.total} />
            <ProcessingStat label="Created" value={stats.created} />
            <ProcessingStat label="Updated" value={stats.updated} />
            <ProcessingStat label="Skipped" value={stats.skipped} />
            <ProcessingStat label="Merged" value={stats.merged} />
            <ProcessingStat label="Invalid" value={stats.invalid} />
          </div>
        </div>
      ) : null}

      {stats.errors?.length && stats.errors.length > 0 ? (
        <div className="py-2">
          <dt className="text-sm font-medium text-gray-700">Errors</dt>
          <dd className="mt-1">
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700">
              {stats.errors.length} error{stats.errors.length > 1 ? 's' : ''}
            </span>
          </dd>
        </div>
      ) : null}
    </dl>
  )
})

const ProcessingStat = memo(function ProcessingStat({
  label,
  value,
}: { label: string; value?: number }) {
  if (value === undefined) return null
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value.toLocaleString()}</dd>
    </div>
  )
})

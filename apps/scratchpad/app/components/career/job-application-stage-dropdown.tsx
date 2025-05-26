import { JobApplicationStage } from '@hominem/utils/career'
import type { JobApplication } from '@hominem/utils/types'
import { ChevronDown } from 'lucide-react'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

interface StageDropdownProps {
  status: JobApplication['status']
  onSelect: (status: JobApplicationStage) => void
  variant?: 'default' | 'ghost'
  className?: string
}

export function JobApplicationStageDropdown({
  status,
  onSelect,
  variant = 'ghost',
  className,
}: StageDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          className={`flex justify-between ${
            variant === 'ghost' ? 'border border-gray-400' : ''
          } ${className}`}
        >
          {status}
          <ChevronDown size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {Object.values(JobApplicationStage).map((status: JobApplicationStage) => (
          <DropdownMenuItem key={status} onClick={() => onSelect(status)}>
            {status}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

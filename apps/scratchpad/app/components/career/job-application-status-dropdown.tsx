import { JobApplicationStatus } from '@hominem/utils/career'
import type { JobApplication } from '@hominem/utils/types'
import { ChevronDown } from 'lucide-react'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

interface StatusDropdownProps {
  status: JobApplication['status']
  onSelect: (status: JobApplicationStatus) => void
  variant?: 'default' | 'ghost'
  className?: string
}

export function JobApplicationStatusDropdown({
  status,
  onSelect,
  variant = 'ghost',
  className,
}: StatusDropdownProps) {
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
        {Object.values(JobApplicationStatus).map((status: JobApplicationStatus) => (
          <DropdownMenuItem key={status} onClick={() => onSelect(status)}>
            {status}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

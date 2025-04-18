'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Category, Possession } from '@hominem/utils/types'
import { format } from 'date-fns'
import { ChevronDown, ChevronUp, Edit, MoreHorizontal, Trash2 } from 'lucide-react'
import { useState } from 'react'

interface PossessionsTableProps {
  possessions: Possession[]
  categories: Record<string, Category>
  loading: boolean
  error: Error | null
  sortField: keyof Possession
  sortDirection: 'asc' | 'desc'
  onEdit: (possession: Possession) => void
  onDelete: (id: string) => void
  onSort: (field: keyof Possession) => void
}

export function PossessionsTable({
  possessions,
  categories,
  loading,
  error,
  sortField,
  sortDirection,
  onEdit,
  onDelete,
  onSort,
}: PossessionsTableProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Function to handle sorting
  const handleSort = (field: keyof Possession) => {
    onSort(field)
  }

  // Function to get sort icon
  const getSortIcon = (field: keyof Possession) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1" />
    )
  }

  // Function to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  // Function to format date
  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A'
    return format(new Date(date), 'MMM d, yyyy')
  }

  // Loading state
  if (loading) {
    return (
      <Card className="p-4">
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={crypto.getRandomValues(new Uint32Array(1))[0]} className="h-16 w-full" />
          ))}
        </div>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="p-6 flex justify-center">
        <div className="text-center">
          <p className="text-red-500 font-semibold">Error loading possessions</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button className="mt-4" variant="secondary">
            Retry
          </Button>
        </div>
      </Card>
    )
  }

  // Empty state
  if (possessions.length === 0) {
    return (
      <Card className="p-6 flex justify-center">
        <div className="text-center">
          <p className="font-semibold">No possessions found</p>
          <p className="text-sm text-muted-foreground">Add your first possession to get started</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
              <div className="flex items-center">
                Name
                {getSortIcon('name')}
              </div>
            </TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort('dateAcquired')}>
              <div className="flex items-center">
                Date Acquired
                {getSortIcon('dateAcquired')}
              </div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort('purchasePrice')}>
              <div className="flex items-center">
                Purchase Price
                {getSortIcon('purchasePrice')}
              </div>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {possessions.map((possession) => (
            <TableRow key={possession.id}>
              <TableCell className="font-medium">
                {possession.name}
                {possession.modelName && (
                  <span className="text-xs text-muted-foreground block">
                    {possession.modelName}
                  </span>
                )}
              </TableCell>
              <TableCell>
                {categories[possession.categoryId] ? (
                  <Badge
                    variant="outline"
                    style={{
                      backgroundColor: categories[possession.categoryId]?.color || 'transparent',
                      color: categories[possession.categoryId]?.color ? 'white' : 'inherit',
                    }}
                  >
                    {categories[possession.categoryId].name}
                  </Badge>
                ) : (
                  'Unknown'
                )}
              </TableCell>
              <TableCell>{formatDate(possession.dateAcquired)}</TableCell>
              <TableCell>{formatCurrency(possession.purchasePrice)}</TableCell>
              <TableCell>
                {possession.dateSold ? (
                  <Badge variant="secondary">Sold</Badge>
                ) : possession.isArchived ? (
                  <Badge variant="outline">Archived</Badge>
                ) : (
                  <Badge variant="default">Active</Badge>
                )}
              </TableCell>
              <TableCell>
                {confirmDelete === possession.id ? (
                  <div className="flex gap-1">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        onDelete(possession.id)
                        setConfirmDelete(null)
                      }}
                    >
                      Yes
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>
                      No
                    </Button>
                  </div>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onEdit(possession)}
                        className="cursor-pointer"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setConfirmDelete(possession.id)}
                        className="cursor-pointer text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

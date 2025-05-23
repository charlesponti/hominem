import { Trash2 } from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import type { SortDirection, SortField, SortOption } from '~/lib/hooks/use-finance-data'

interface SortRowProps {
  sortOption: SortOption
  index: number
  allSortableFields: SortField[]
  usedFields: SortField[]
  updateSortOption: (index: number, option: SortOption) => void
  removeSortOption: (index: number) => void
}

export function SortRow({
  sortOption,
  index,
  allSortableFields,
  usedFields,
  updateSortOption,
  removeSortOption,
}: SortRowProps) {
  const availableFieldsForCurrentSelect = allSortableFields.filter(
    (field) => !usedFields.includes(field) || field === sortOption.field
  )

  return (
    <div
      key={sortOption.field}
      className="flex items-center gap-2 p-2 border rounded-md bg-slate-50"
    >
      <Select
        value={sortOption.field}
        onValueChange={(value) =>
          updateSortOption(index, { ...sortOption, field: value as SortField })
        }
      >
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <SelectValue placeholder="Select field" />
        </SelectTrigger>
        <SelectContent>
          {availableFieldsForCurrentSelect.map((field) => (
            <SelectItem key={field} value={field} className="text-xs">
              {field.charAt(0).toUpperCase() + field.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={sortOption.direction}
        onValueChange={(value) =>
          updateSortOption(index, { ...sortOption, direction: value as SortDirection })
        }
      >
        <SelectTrigger className="w-[110px] h-8 text-xs">
          <SelectValue placeholder="Direction" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="asc" className="text-xs">
            Ascending
          </SelectItem>
          <SelectItem value="desc" className="text-xs">
            Descending
          </SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => removeSortOption(index)}
        className="h-8 w-8 p-0"
      >
        <Trash2 className="h-3 w-3 text-muted-foreground" />
      </Button>
    </div>
  )
}

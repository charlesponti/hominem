'use client'

import { useAuth } from '@clerk/react-router'
import type { Category, Possession, PossessionInsert } from '@hominem/utils/types'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '~/components/ui/button'
import { Calendar } from '~/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/ui/form'
import { Input } from '~/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Switch } from '~/components/ui/switch'
import { Textarea } from '~/components/ui/textarea'
import { cn } from '~/lib/utils'

// Define form validation schema
const possessionFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  dateAcquired: z.date({
    required_error: 'Date acquired is required',
  }),
  dateSold: z.date().optional().nullable(),
  brandId: z.string().optional().nullable(),
  categoryId: z.string({
    required_error: 'Category is required',
  }),
  purchasePrice: z.coerce.number().min(0, 'Price must be a positive number'),
  salePrice: z.coerce.number().min(0, 'Price must be a positive number').optional().nullable(),
  url: z.string().url().optional().nullable(),
  color: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  modelName: z.string().optional().nullable(),
  modelNumber: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  fromUserId: z.string().optional().nullable(),
  isArchived: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
})

type PossessionFormValues = z.infer<typeof possessionFormSchema>

interface PossessionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  possession?: Possession | null
  categories: Category[]
  onSubmit: (data: PossessionInsert | Partial<Possession>) => void
}
export function PossessionFormDialog({
  open,
  onOpenChange,
  possession,
  categories,
  onSubmit,
}: PossessionFormDialogProps) {
  const { userId } = useAuth()
  const isEditing = !!possession
  const [isSubmitting, setIsSubmitting] = useState(false)

  const defaultValues: PossessionFormValues = possession
    ? {
        name: possession.name,
        description: possession.description ?? undefined,
        dateAcquired: possession.dateAcquired ? new Date(possession.dateAcquired) : new Date(),
        dateSold: possession.dateSold ? new Date(possession.dateSold) : undefined,
        brandId: possession.brandId ?? undefined,
        categoryId: possession.categoryId,
        purchasePrice: possession.purchasePrice,
        salePrice: possession.salePrice ?? undefined,
        url: possession.url ?? undefined,
        color: possession.color ?? undefined,
        imageUrl: possession.imageUrl ?? undefined,
        modelName: possession.modelName ?? undefined,
        modelNumber: possession.modelNumber ?? undefined,
        serialNumber: possession.serialNumber ?? undefined,
        notes: possession.notes ?? undefined,
        size: possession.size ?? undefined,
        fromUserId: possession.fromUserId ?? undefined,
        isArchived: possession.isArchived,
        tags: possession.tags || [],
      }
    : {
        name: '',
        description: '',
        dateAcquired: new Date(),
        dateSold: null,
        brandId: null,
        categoryId: '',
        purchasePrice: 0,
        salePrice: null,
        url: '',
        color: '',
        imageUrl: '',
        modelName: '',
        modelNumber: '',
        serialNumber: '',
        notes: '',
        size: '',
        fromUserId: null,
        isArchived: false,
        tags: [],
      }

  const form = useForm<PossessionFormValues>({
    defaultValues,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })
  const {
    control,
    formState: { errors },
    setError,
  } = form

  // useEffect(() => {
  //   if (open) {
  //     reset(defaultValues)
  //   }
  // }, [open, possession])

  async function onFormSubmit(values: PossessionFormValues) {
    setIsSubmitting(true)
    try {
      const parsed = possessionFormSchema.safeParse(values)
      if (!parsed.success) {
        for (const err of parsed.error.errors) {
          if (err.path[0])
            setError(err.path[0] as keyof PossessionFormValues, { message: err.message })
        }
        setIsSubmitting(false)
        return
      }
      const value = parsed.data
      const normalized = {
        ...value,
        description: value.description ?? undefined,
        notes: value.notes ?? undefined,
        brandId: value.brandId ?? undefined,
        salePrice: value.salePrice ?? undefined,
        url: value.url ?? undefined,
        color: value.color ?? undefined,
        imageUrl: value.imageUrl ?? undefined,
        modelName: value.modelName ?? undefined,
        modelNumber: value.modelNumber ?? undefined,
        serialNumber: value.serialNumber ?? undefined,
        size: value.size ?? undefined,
        fromUserId: value.fromUserId ?? undefined,
      }
      if (!isEditing) {
        onSubmit({ ...normalized, userId } as PossessionInsert)
      } else {
        onSubmit({ ...normalized, id: possession.id })
      }
      onOpenChange(false)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error submitting form:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Possession' : 'Add New Possession'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the details of your possession.'
              : 'Enter the details of your new possession.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => <Input {...field} placeholder="Enter name" />}
                />
              </FormControl>
              <FormMessage>{errors.name?.message}</FormMessage>
            </FormItem>
            {/* Category */}
            <FormItem>
              <FormLabel>Category *</FormLabel>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FormMessage>{errors.categoryId?.message}</FormMessage>
            </FormItem>
            {/* Date Acquired */}
            <FormItem className="flex flex-col">
              <FormLabel>Date Acquired *</FormLabel>
              <Controller
                name="dateAcquired"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            'pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              <FormMessage>{errors.dateAcquired?.message}</FormMessage>
            </FormItem>
            {/* Purchase Price */}
            <FormItem>
              <FormLabel>Purchase Price *</FormLabel>
              <FormControl>
                <Controller
                  name="purchasePrice"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} type="number" min="0" step="0.01" placeholder="0.00" />
                  )}
                />
              </FormControl>
              <FormMessage>{errors.purchasePrice?.message}</FormMessage>
            </FormItem>
            {/* Date Sold */}
            <FormItem className="flex flex-col">
              <FormLabel>Date Sold</FormLabel>
              <Controller
                name="dateSold"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            'pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'PPP') : <span>Not sold yet</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              <FormMessage>{errors.dateSold?.message}</FormMessage>
            </FormItem>
            {/* Sale Price */}
            <FormItem>
              <FormLabel>Sale Price</FormLabel>
              <FormControl>
                <Controller
                  name="salePrice"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      disabled={!control._formValues.dateSold}
                    />
                  )}
                />
              </FormControl>
              <FormMessage>{errors.salePrice?.message}</FormMessage>
            </FormItem>
            {/* Model Name */}
            <FormItem>
              <FormLabel>Model Name</FormLabel>
              <FormControl>
                <Controller
                  name="modelName"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ''} placeholder="Model name" />
                  )}
                />
              </FormControl>
              <FormMessage>{errors.modelName?.message}</FormMessage>
            </FormItem>
            {/* Model Number */}
            <FormItem>
              <FormLabel>Model Number</FormLabel>
              <FormControl>
                <Controller
                  name="modelNumber"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ''} placeholder="Model number" />
                  )}
                />
              </FormControl>
              <FormMessage>{errors.modelNumber?.message}</FormMessage>
            </FormItem>
            {/* Color */}
            <FormItem>
              <FormLabel>Color</FormLabel>
              <FormControl>
                <Controller
                  name="color"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ''} placeholder="Color" />
                  )}
                />
              </FormControl>
              <FormMessage>{errors.color?.message}</FormMessage>
            </FormItem>
            {/* Size */}
            <FormItem>
              <FormLabel>Size</FormLabel>
              <FormControl>
                <Controller
                  name="size"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ''} placeholder="Size" />
                  )}
                />
              </FormControl>
              <FormMessage>{errors.size?.message}</FormMessage>
            </FormItem>
            {/* Serial Number */}
            <FormItem>
              <FormLabel>Serial Number</FormLabel>
              <FormControl>
                <Controller
                  name="serialNumber"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ''} placeholder="Serial number" />
                  )}
                />
              </FormControl>
              <FormMessage>{errors.serialNumber?.message}</FormMessage>
            </FormItem>
            {/* URL */}
            <FormItem>
              <FormLabel>URL</FormLabel>
              <FormControl>
                <Controller
                  name="url"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ''} placeholder="https://..." />
                  )}
                />
              </FormControl>
              <FormMessage>{errors.url?.message}</FormMessage>
            </FormItem>
            {/* Image URL */}
            <FormItem>
              <FormLabel>Image URL</FormLabel>
              <FormControl>
                <Controller
                  name="imageUrl"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} value={field.value ?? ''} placeholder="https://..." />
                  )}
                />
              </FormControl>
              <FormMessage>{errors.imageUrl?.message}</FormMessage>
            </FormItem>
            {/* Archived */}
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Archived</FormLabel>
                <FormDescription>Mark this possession as archived</FormDescription>
              </div>
              <FormControl>
                <Controller
                  name="isArchived"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </FormControl>
            </FormItem>
          </div>
          {/* Description */}
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Controller
                name="description"
                control={control}
                render={({ field }) => <Textarea {...field} className="min-h-[100px]" />}
              />
            </FormControl>
            <FormMessage>{errors.description?.message}</FormMessage>
          </FormItem>
          {/* Notes */}
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <Textarea {...field} value={field.value ?? ''} className="min-h-[100px]" />
                )}
              />
            </FormControl>
            <FormMessage>{errors.notes?.message}</FormMessage>
          </FormItem>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

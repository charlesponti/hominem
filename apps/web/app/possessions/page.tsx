'use client'

import { PossessionFormDialog } from '@/components/possessions/possession-form-dialog'
import { PossessionsTable } from '@/components/possessions/possessions-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePossessions } from '@/hooks/use-possessions'
import { useAuth } from '@clerk/nextjs'
import type { Possession, PossessionInsert } from '@hominem/utils/types'
import { PlusCircle, RefreshCcw, Search } from 'lucide-react'
import { useState } from 'react'

export default function PossessionsPage() {
  const { userId } = useAuth()
  const [formOpen, setFormOpen] = useState<boolean>(false)
  const {
    possessions,
    filteredPossessions,
    categories,
    categoriesMap,
    loading,
    possessionsError,
    categoriesError,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    possessionToEdit,
    setPossessionToEdit,
    newPossession,
    setNewPossession,
    createPossession,
    updatePossession,
    deletePossession,
    getTotalValue,
  } = usePossessions()

  // Handle opening the edit dialog
  const handleEditPossession = (possession: Possession) => {
    setPossessionToEdit(possession)
    setFormOpen(true)
  }

  // Handle opening the create dialog
  const handleAddPossession = () => {
    setPossessionToEdit(null)
    setFormOpen(true)
  }

  // Handle form submission
  const handleFormSubmit = (data: PossessionInsert | Partial<Possession>) => {
    if (possessionToEdit) {
      updatePossession.mutate({ ...data, id: possessionToEdit.id })
    } else if (userId) {
      createPossession.mutate({ ...data, userId } as PossessionInsert)
    }
  }

  // Handle sorting
  const handleSort = (field: keyof Possession) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Format total value as currency
  const formattedTotalValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(getTotalValue())

  // Error state
  const error = possessionsError || categoriesError

  return (
    <Tabs defaultValue="all" className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold">Possessions</h1>

        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">
            Total Value: <span className="font-bold">{formattedTotalValue}</span>
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleAddPossession}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Possession
          </Button>
        </div>
      </div>

      <TabsList>
        <TabsTrigger value="all">All Items</TabsTrigger>
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="sold">Sold</TabsTrigger>
        <TabsTrigger value="archived">Archived</TabsTrigger>
      </TabsList>

      {/* Filters Card */}
      <Card>
        <CardHeader className="py-2 px-4">
          <CardTitle className="text-md text-muted-foreground">Filters</CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="text-sm font-medium mb-1 block">
                Category
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="searchQuery" className="text-sm font-medium mb-1 block">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="searchQuery"
                  placeholder="Search by name or description..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      <TabsContent value="all" className="mt-0">
        <PossessionsTable
          possessions={filteredPossessions}
          categories={categoriesMap}
          loading={loading}
          error={error}
          sortField={sortField}
          sortDirection={sortDirection}
          onEdit={handleEditPossession}
          onDelete={(id) => deletePossession.mutate(id)}
          onSort={handleSort}
        />
      </TabsContent>

      <TabsContent value="active" className="mt-0">
        <PossessionsTable
          possessions={filteredPossessions.filter((p) => !p.dateSold && !p.isArchived)}
          categories={categoriesMap}
          loading={loading}
          error={error}
          sortField={sortField}
          sortDirection={sortDirection}
          onEdit={handleEditPossession}
          onDelete={(id) => deletePossession.mutate(id)}
          onSort={handleSort}
        />
      </TabsContent>

      <TabsContent value="sold" className="mt-0">
        <PossessionsTable
          possessions={filteredPossessions.filter((p) => p.dateSold)}
          categories={categoriesMap}
          loading={loading}
          error={error}
          sortField={sortField}
          sortDirection={sortDirection}
          onEdit={handleEditPossession}
          onDelete={(id) => deletePossession.mutate(id)}
          onSort={handleSort}
        />
      </TabsContent>

      <TabsContent value="archived" className="mt-0">
        <PossessionsTable
          possessions={filteredPossessions.filter((p) => p.isArchived)}
          categories={categoriesMap}
          loading={loading}
          error={error}
          sortField={sortField}
          sortDirection={sortDirection}
          onEdit={handleEditPossession}
          onDelete={(id) => deletePossession.mutate(id)}
          onSort={handleSort}
        />
      </TabsContent>

      {/* Possession Form Dialog */}
      <PossessionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        possession={possessionToEdit}
        categories={categories}
        onSubmit={handleFormSubmit}
      />
    </Tabs>
  )
}

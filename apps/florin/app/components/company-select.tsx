'use client'

import type { Company } from '@hominem/utils/types'
import { CommandLoading } from 'cmdk'
import * as React from 'react'
import { Button } from '~/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command'
import { Drawer, DrawerContent, DrawerTrigger } from '~/components/ui/drawer'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { useCompanySearch } from '~/lib/hooks/use-company-search'
import { useMediaQuery } from '~/lib/hooks/use-media-query'

interface CompanySelectProps {
  value?: string
  onSelectAction: (companyId: string) => void
}

export function CompanySelect({ value, onSelectAction }: CompanySelectProps) {
  const [open, setOpen] = React.useState(false)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const { companies, isLoading, search, setSearch, createCompany } = useCompanySearch()

  const triggerButton = (
    <Button variant="outline" className="w-full justify-start">
      {companies?.find((c) => c.id === value)?.name || 'Select a company'}
    </Button>
  )

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
        <PopoverContent className="min-w-[400px]  p-0" align="start">
          <CompanyList
            companies={companies}
            isLoading={isLoading}
            search={search}
            setSearch={setSearch}
            onSelectAction={(id) => {
              onSelectAction(id)
              setOpen(false)
            }}
            onCreateCompany={async () => {
              const company = await createCompany(search)
              if (company) {
                onSelectAction(company.id)
                setOpen(false)
              }
            }}
          />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
      <DrawerContent>
        <div className="mt-4 border-t">
          <CompanyList
            companies={companies}
            isLoading={isLoading}
            search={search}
            setSearch={setSearch}
            onSelectAction={(id) => {
              onSelectAction(id)
              setOpen(false)
            }}
            onCreateCompany={async () => {
              const company = await createCompany(search)
              if (company) {
                onSelectAction(company.id)
                setOpen(false)
              }
            }}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

interface CompanyListProps {
  companies?: Company[]
  isLoading: boolean
  search: string
  setSearch: (search: string) => void
  onSelectAction: (id: string) => void
  onCreateCompany: () => void
}

function CompanyList({
  companies,
  isLoading,
  search,
  setSearch,
  onSelectAction,
  onCreateCompany,
}: CompanyListProps) {
  const showCreate = !isLoading && search && companies?.length === 0

  return (
    <Command>
      <CommandInput
        placeholder="Search companies..."
        className="my-2 focus:outline-gray-300 px-3 py-2 h-fit"
        value={search}
        onValueChange={setSearch}
      />
      {search.length > 0 ? (
        <CommandList>
          {showCreate ? (
            <CommandEmpty>
              {showCreate ? (
                <div className="p-2">
                  <Button onClick={onCreateCompany}>Create &quot;{search}&quot;</Button>
                </div>
              ) : (
                <span>No companies found.</span>
              )}
            </CommandEmpty>
          ) : null}
          {isLoading ? (
            <CommandLoading>
              <div className="p-2">
                <span className="loading loading-dots text-gray-300" />
              </div>
            </CommandLoading>
          ) : null}
          <CommandGroup>
            {companies?.map((company) => (
              <CommandItem
                key={company.id}
                value={company.name}
                onSelect={onSelectAction.bind(null, company.id)}
              >
                {company.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      ) : null}
    </Command>
  )
}

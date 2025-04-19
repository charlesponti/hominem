import { Check, ChevronsUpDown } from 'lucide-react'
import { useCallback, useState } from 'react'
import { cn } from 'src/lib/utils'
import { Button } from './ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

const frameworkGroups = [
  {
    label: 'Frontend',
    frameworks: [
      { value: 'next.js', label: 'Next.js' },
      { value: 'sveltekit', label: 'SvelteKit' },
      { value: 'nuxt.js', label: 'Nuxt.js' },
      { value: 'remix', label: 'Remix' },
      { value: 'astro', label: 'Astro' },
    ],
  },
  {
    label: 'Backend',
    frameworks: [
      { value: 'express', label: 'Express' },
      { value: 'nest.js', label: 'Nest.js' },
      { value: 'django', label: 'Django' },
      { value: 'laravel', label: 'Laravel' },
    ],
  },
  {
    label: 'Full Stack',
    frameworks: [
      { value: 'meteor', label: 'Meteor' },
      { value: 'redwood', label: 'RedwoodJS' },
      { value: 'gatsby', label: 'Gatsby' },
    ],
  },
]

// Compute frameworkMap and frameworkSearchMap outside the component
const { frameworkMap, frameworkSearchMap } = (() => {
  const map = new Map()
  const searchMap = new Map()

  for (const group of frameworkGroups) {
    for (const framework of group.frameworks) {
      const enhancedFramework = { ...framework, group: group.label }
      map.set(framework.value, enhancedFramework)
      searchMap.set(framework.label.toLowerCase(), enhancedFramework)
    }
  }

  return { frameworkMap: map, frameworkSearchMap: searchMap }
})()

export default function TypeaheadDropdown() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // const filteredFrameworks = useMemo(() => {
  // 	const lowercaseQuery = searchQuery.toLowerCase();
  // 	return Array.from(frameworkSearchMap.entries())
  // 		.filter(([key]) => key.includes(lowercaseQuery))
  // 		.map(([, framework]) => framework)
  // 		.slice(0, 5);
  // }, [searchQuery]);

  // const groupedFilteredFrameworks = useMemo(() => {
  // 	const groupedFrameworks = new Map();

  // 	for (const framework of filteredFrameworks) {
  // 		if (!groupedFrameworks.has(framework.group)) {
  // 			groupedFrameworks.set(framework.group, []);
  // 		}
  // 		groupedFrameworks.get(framework.group).push(framework);
  // 	}

  // 	return Array.from(groupedFrameworks.entries()).map(
  // 		([group, frameworks]) => ({
  // 			label: group,
  // 			frameworks,
  // 		}),
  // 	);
  // }, [filteredFrameworks]);

  const getSelectedFramework = useCallback(
    (value) => frameworkMap.get(value),
    [] // Empty dependency array as frameworkMap is now static
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          // biome-ignore lint/a11y/useSemanticElements: <explanation>
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {value ? getSelectedFramework(value)?.label : 'Select framework...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search framework..." onValueChange={setSearchQuery} />
          <CommandList>
            <CommandEmpty>No framework found.</CommandEmpty>
            {frameworkGroups.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.frameworks.map((framework) => (
                  <CommandItem
                    key={framework.value}
                    value={framework.value}
                    onSelect={(currentValue) => {
                      setValue(currentValue === value ? '' : currentValue)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === framework.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {framework.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

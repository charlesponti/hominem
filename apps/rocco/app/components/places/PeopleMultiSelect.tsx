import { Button } from '@hominem/ui/button';
import { Badge } from '@hominem/ui/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@hominem/ui/components/ui/command';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@hominem/ui/components/ui/drawer';
import { Check, Loader2, Plus, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { usePeople, useCreatePerson } from '~/lib/hono';
import { cn } from '~/lib/utils';

interface Person {
  id: string;
  firstName: string;
  lastName: string | null;
}

interface PeopleMultiSelectProps {
  value: string[];
  onChange: (personIds: string[]) => void;
  placeholder?: string;
}

export function PeopleMultiSelect({
  value,
  onChange,
  placeholder = 'Select people...',
}: PeopleMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { data: peopleResult, isLoading } = usePeople();
  const people = peopleResult ?? [];
  const createPersonMutation = useCreatePerson();

  const selectedPeople = useMemo(() => {
    return people.filter((person: any) => value.includes(person.id));
  }, [people, value]);

  const filteredPeople = useMemo(() => {
    if (!searchQuery.trim()) {
      return people;
    }

    const query = searchQuery.toLowerCase().trim();
    return people.filter((person: any) => {
      const fullName = `${person.firstName} ${person.lastName || ''}`.toLowerCase();
      return (
        person.firstName.toLowerCase().includes(query) ||
        person.lastName?.toLowerCase().includes(query) ||
        fullName.includes(query)
      );
    });
  }, [people, searchQuery]);

  const canCreateNew = useMemo(() => {
    if (!searchQuery.trim() || isCreating) {
      return false;
    }
    const query = searchQuery.toLowerCase().trim();
    return !filteredPeople.some((person: any) => {
      const fullName = `${person.firstName} ${person.lastName || ''}`.toLowerCase();
      return fullName === query || person.firstName.toLowerCase() === query;
    });
  }, [searchQuery, filteredPeople, isCreating]);

  const handleTogglePerson = useCallback(
    (personId: string) => {
      if (value.includes(personId)) {
        onChange(value.filter((id) => id !== personId));
      } else {
        onChange([...value, personId]);
      }
    },
    [value, onChange],
  );

  const handleRemovePerson = useCallback(
    (personId: string) => {
      onChange(value.filter((id) => id !== personId));
    },
    [value, onChange],
  );

  const handleCreatePerson = useCallback(() => {
    const nameParts = searchQuery.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || undefined;

    if (!firstName) {
      return;
    }

    setIsCreating(true);
    createPersonMutation.mutate({
      firstName,
      lastName,
    });
  }, [searchQuery, createPersonMutation]);

  const getPersonDisplayName = (person: Person) => {
    return person.lastName ? `${person.firstName} ${person.lastName}` : person.firstName;
  };

  return (
    <div className="space-y-2">
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between min-h-10 h-auto py-1.5"
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {selectedPeople.length > 0 ? (
                selectedPeople.map((person: any) => (
                  <Badge
                    key={person.id}
                    variant="secondary"
                    className="mr-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePerson(person.id);
                    }}
                  >
                    {getPersonDisplayName(person)}
                    <button
                      type="button"
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRemovePerson(person.id);
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemovePerson(person.id);
                      }}
                    >
                      <X className="size-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Select People</DrawerTitle>
            <DrawerDescription>
              Search and select people to include in this visit.
            </DrawerDescription>
          </DrawerHeader>
          <Command className="border-none">
            <CommandInput
              autoFocus
              placeholder="Search people..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-4 animate-spin" />
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    {canCreateNew ? (
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={handleCreatePerson}
                        disabled={isCreating}
                      >
                        {isCreating ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 size-4" />
                        )}
                        Create &quot;{searchQuery}&quot;
                      </Button>
                    ) : (
                      'No people found.'
                    )}
                  </CommandEmpty>
                  <CommandGroup>
                    {filteredPeople.map((person: any) => {
                      const isSelected = value.includes(person.id);
                      return (
                        <CommandItem
                          key={person.id}
                          value={getPersonDisplayName(person)}
                          onSelect={() => handleTogglePerson(person.id)}
                          className="flex items-center justify-between"
                        >
                          <span className="flex-1">{getPersonDisplayName(person)}</span>
                          <Check
                            className={cn('size-4 text-success', {
                              'opacity-0': !isSelected,
                              'opacity-100': isSelected,
                            })}
                          />
                        </CommandItem>
                      );
                    })}
                    {canCreateNew && filteredPeople.length > 0 && (
                      <CommandItem
                        value={`create-${searchQuery}`}
                        onSelect={handleCreatePerson}
                        className="flex items-center"
                        disabled={isCreating}
                      >
                        {isCreating ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 size-4" />
                        )}
                        Create &quot;{searchQuery}&quot;
                      </CommandItem>
                    )}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

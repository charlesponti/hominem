import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandListLoading,
} from '@hominem/ui/components/ui/command';
import { DrawerDescription, DrawerHeader, DrawerTitle } from '@hominem/ui/components/ui/drawer';
import { Check, Loader2, Plus } from 'lucide-react';
import { useMemo, useState, useCallback } from 'react';
import { useRevalidator } from 'react-router';
import { useAddPlaceToList, useRemoveListItem } from '~/lib/places';
import { trpc } from '~/lib/trpc/client';
import { cn } from '~/lib/utils';

interface AddToListDrawerContentProps {
  place: any; // Using any for now to match current implementation, should be typed properly
  resolvedPlaceId: string | undefined;
  googleMapsId: string | undefined;
  onClose: () => void;
}

export const AddToListDrawerContent = ({
  place,
  resolvedPlaceId,
  googleMapsId,
  onClose,
}: AddToListDrawerContentProps) => {
  const [loadingListId, setLoadingListId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const revalidator = useRevalidator();

  const { isLoading, data: rawLists } = trpc.lists.getAll.useQuery();

  const lists = useMemo(() => {
    if (!(rawLists && googleMapsId)) {
      return [];
    }
    return rawLists.map((list) => ({
      ...list,
      isInList: list.places?.some((p) => p.googleMapsId === googleMapsId) ?? false,
    }));
  }, [rawLists, googleMapsId]);

  const removeFromListMutation = useRemoveListItem({
    onSettled: () => {
      setLoadingListId(null);
      revalidator.revalidate();
      onClose();
    },
  });

  const addToListMutation = useAddPlaceToList({
    onSuccess: () => {
      revalidator.revalidate();
      onClose();
    },
    onSettled: () => setLoadingListId(null),
  });

  const createListMutation = trpc.lists.create.useMutation();

  const onListSelectChange = useCallback(
    (listId: string, isInList: boolean) => {
      if (!place) {
        return;
      }

      setLoadingListId(listId);
      if (isInList) {
        if (resolvedPlaceId) {
          removeFromListMutation.mutateAsync({ listId, itemId: resolvedPlaceId });
        } else {
          setLoadingListId(null);
        }
        return;
      }

      if (!place.googleMapsId) {
        throw new Error('googleMapsId is required');
      }

      addToListMutation.mutate({
        name: place.name,
        address: place.address || undefined,
        latitude: place.latitude || undefined,
        longitude: place.longitude || undefined,
        imageUrl: place.imageUrl || undefined,
        googleMapsId: place.googleMapsId,
        rating: place.rating || undefined,
        types: place.types || undefined,
        websiteUri: place.websiteUri || undefined,
        phoneNumber: place.phoneNumber || undefined,
        photos: place.photos || undefined,
        listIds: [listId],
      });
    },
    [place, resolvedPlaceId, removeFromListMutation, addToListMutation],
  );

  const handleCreateList = useCallback(async () => {
    if (!searchQuery.trim() || !place?.googleMapsId) {
      return;
    }

    try {
      const newList = await createListMutation.mutateAsync({
        name: searchQuery.trim(),
        description: '',
        isPublic: false,
      });

      if (newList) {
        onListSelectChange(newList.id, false);
      }
    } catch (error) {
      console.error('Failed to create list:', error);
    }
  }, [searchQuery, place?.googleMapsId, createListMutation, onListSelectChange]);

  const filteredLists = useMemo(() => {
    if (!searchQuery.trim()) {
      return lists;
    }
    const query = searchQuery.toLowerCase().trim();
    return lists.filter((list) => list.name.toLowerCase().includes(query));
  }, [lists, searchQuery]);

  const canCreateNew = useMemo(() => {
    if (!searchQuery.trim()) {
      return false;
    }
    const query = searchQuery.toLowerCase().trim();
    return !lists.some((list) => list.name.toLowerCase() === query);
  }, [lists, searchQuery]);

  return (
    <div className="mx-auto w-full max-w-lg">
      <DrawerHeader>
        <DrawerTitle>Add to lists</DrawerTitle>
        <DrawerDescription>
          Choose a list to add this place to, or create a new one.
        </DrawerDescription>
      </DrawerHeader>
      <Command className="rounded-none border-none">
        <CommandInput
          placeholder="Search lists..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList className="max-h-[40vh]">
          {isLoading ? (
            <CommandListLoading />
          ) : (
            <>
              <CommandEmpty>No lists found.</CommandEmpty>
              <CommandGroup>
                {canCreateNew && (
                  <CommandItem
                    value={`create-${searchQuery}`}
                    onSelect={handleCreateList}
                    className="flex items-center"
                    disabled={createListMutation.isPending}
                  >
                    {createListMutation.isPending ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 size-4" />
                    )}
                    Create &quot;{searchQuery}&quot;
                  </CommandItem>
                )}
                {filteredLists.map((list) => (
                  <CommandItem
                    key={list.id}
                    value={list.name}
                    onSelect={() => {
                      onListSelectChange(list.id, list.isInList);
                    }}
                    className="flex items-center justify-between"
                  >
                    <span className="flex-1">{list.name}</span>
                    {loadingListId === list.id ||
                    (createListMutation.isPending && searchQuery.trim() === list.name) ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Check
                        className={cn('size-4', {
                          'opacity-0': !list.isInList,
                          'opacity-100': list.isInList,
                        })}
                      />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </div>
  );
};

export default AddToListDrawerContent;

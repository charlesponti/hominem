import { Button } from '@hominem/ui/button';
import { Pencil } from 'lucide-react';
import { useState } from 'react';

import type { List } from '~/lib/types';

import ListEditDialog from './list-edit-dialog';

interface ListEditButtonProps {
  list: List;
}

export default function ListEditButton({ list }: ListEditButtonProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className="size-8 hover:text-indigo-600 focus-visible:bg-indigo-50"
        onClick={() => setIsEditDialogOpen(true)}
        aria-label="Edit list"
      >
        <Pencil size={16} />
        <span className="sr-only">Edit list</span>
      </Button>
      <ListEditDialog list={list} isOpen={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} />
    </>
  );
}

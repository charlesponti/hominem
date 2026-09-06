import { LoaderCircle, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { useCreateCollection } from '~/hooks/use-collections';

import { VisibilitySelect } from './visibility-select';

export function CreateCollectionDialog() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'shared'>('private');
  const createCollection = useCreateCollection();

  const trimmedName = name.trim();

  function handleSubmit() {
    if (!trimmedName) return;
    createCollection.mutate(
      { name: trimmedName, description: description.trim() || undefined, visibility },
      {
        onSuccess: ({ collection }) => {
          setName('');
          setDescription('');
          setVisibility('private');
          setOpen(false);
          void navigate(`/collections/${collection.id}`, { viewTransition: true });
        },
      },
    );
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus /> New collection
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New collection</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block space-y-2 text-xs">
            <span className="text-muted-foreground">Name</span>
            <Input
              onChange={(event) => setName(event.target.value)}
              placeholder="Lake Arrowhead"
              value={name}
            />
          </label>
          <label className="block space-y-2 text-xs">
            <span className="text-muted-foreground">Description (optional)</span>
            <Textarea
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              value={description}
            />
          </label>
          <label className="block space-y-2 text-xs">
            <span className="text-muted-foreground">Visibility</span>
            <VisibilitySelect onChange={setVisibility} value={visibility} />
          </label>
          {createCollection.isError ? (
            <p className="text-sm text-destructive">Could not create collection.</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            disabled={createCollection.isPending || !trimmedName}
            onClick={handleSubmit}
            type="button"
          >
            {createCollection.isPending ? (
              <>
                <LoaderCircle className="animate-spin" /> Creating…
              </>
            ) : (
              'Create'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

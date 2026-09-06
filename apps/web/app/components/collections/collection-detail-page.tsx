import { ArrowLeft, LogOut, Mail, Pencil, Trash2, UserMinus, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useRouteLoaderData } from 'react-router';

import { Badge } from '~/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Textarea } from '~/components/ui/textarea';
import {
  isInvitableRole,
  memberDisplayName,
  useCollectionDetail,
  useDeleteCollection,
  useInviteMember,
  useLeaveCollection,
  useRemoveCollectionItem,
  useRemoveMember,
  useUpdateCollection,
} from '~/hooks/use-collections';
import type { User } from '~/lib/auth.server';

import { RoleSelect } from './role-select';
import { VisibilitySelect } from './visibility-select';

function EditCollectionDialog({
  collectionId,
  name,
  description,
  visibility,
}: {
  collectionId: string;
  name: string;
  description: string | null;
  visibility: 'private' | 'shared';
}) {
  const [open, setOpen] = useState(false);
  const [nameValue, setNameValue] = useState(name);
  const [descriptionValue, setDescriptionValue] = useState(description ?? '');
  const [visibilityValue, setVisibilityValue] = useState(visibility);
  const updateCollection = useUpdateCollection(collectionId);

  const trimmedName = nameValue.trim();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setNameValue(name);
      setDescriptionValue(description ?? '');
      setVisibilityValue(visibility);
    }
  }

  function handleSubmit() {
    if (!trimmedName) return;
    updateCollection.mutate(
      {
        name: trimmedName,
        description: descriptionValue.trim() || null,
        visibility: visibilityValue,
      },
      { onSuccess: () => setOpen(false) },
    );
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button aria-label="Edit collection" size="icon-sm" variant="ghost">
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit collection</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block space-y-2 text-xs">
            <span className="text-muted-foreground">Name</span>
            <Input onChange={(event) => setNameValue(event.target.value)} value={nameValue} />
          </label>
          <label className="block space-y-2 text-xs">
            <span className="text-muted-foreground">Description (optional)</span>
            <Textarea
              onChange={(event) => setDescriptionValue(event.target.value)}
              rows={3}
              value={descriptionValue}
            />
          </label>
          <label className="block space-y-2 text-xs">
            <span className="text-muted-foreground">Visibility</span>
            <VisibilitySelect onChange={setVisibilityValue} value={visibilityValue} />
          </label>
          {updateCollection.isError ? (
            <p className="text-sm text-destructive">Could not save changes.</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            disabled={updateCollection.isPending || !trimmedName}
            onClick={handleSubmit}
            type="button"
          >
            {updateCollection.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function InviteMemberDialog({
  collectionId,
  ownEmail,
}: {
  collectionId: string;
  ownEmail: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('viewer');
  const inviteMember = useInviteMember(collectionId);

  const trimmedEmail = email.trim();
  const isSelfInvite =
    !!ownEmail && !!trimmedEmail && trimmedEmail.toLowerCase() === ownEmail.toLowerCase();

  function handleSubmit() {
    if (!trimmedEmail || isSelfInvite) return;
    inviteMember.mutate(
      { email: trimmedEmail, role },
      {
        onSuccess: () => {
          setEmail('');
          setOpen(false);
        },
      },
    );
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus /> Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a collaborator</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block space-y-2 text-xs">
            <span className="text-muted-foreground">Email</span>
            <Input
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              type="email"
              value={email}
            />
          </label>
          <label className="block space-y-2 text-xs">
            <span className="text-muted-foreground">Role</span>
            <Select
              onValueChange={(value) => {
                if (isInvitableRole(value)) setRole(value);
              }}
              value={role}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
              </SelectContent>
            </Select>
          </label>
          {isSelfInvite ? (
            <p className="text-sm text-destructive">You can't invite yourself.</p>
          ) : null}
          {inviteMember.isError ? (
            <p className="text-sm text-destructive">Could not send invite.</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            disabled={inviteMember.isPending || !trimmedEmail || isSelfInvite}
            onClick={handleSubmit}
            type="button"
          >
            {inviteMember.isPending ? 'Inviting…' : 'Send invite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CollectionDetailPage({ collectionId }: { collectionId: string }) {
  const navigate = useNavigate();
  const layoutData = useRouteLoaderData<{ user: User | null }>('routes/layout');
  const currentUserId = layoutData?.user?.id;
  const currentUserEmail = layoutData?.user?.email;
  const { data, error, isPending, refetch } = useCollectionDetail(collectionId);
  const removeMember = useRemoveMember(collectionId);
  const removeItem = useRemoveCollectionItem(collectionId);
  const deleteCollection = useDeleteCollection(collectionId);
  const leaveCollection = useLeaveCollection(collectionId);

  const collection = data?.collection;
  const items = data?.items ?? [];
  const members = data?.members ?? [];
  const viewerRole = data?.viewerRole ?? null;
  const isOwner = viewerRole === 'owner';
  const canManageItems = isOwner || viewerRole === 'editor';
  const canLeave = viewerRole === 'editor' || viewerRole === 'viewer';

  function goToCollectionsList() {
    // eslint-disable-next-line no-void -- fire-and-forget navigation, result intentionally unused
    void navigate('/collections', { viewTransition: true });
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${collection?.name}"? This can't be undone.`)) return;
    deleteCollection.mutate(undefined, { onSuccess: goToCollectionsList });
  }

  function handleLeave() {
    if (!window.confirm(`Leave "${collection?.name}"?`)) return;
    leaveCollection.mutate(undefined, { onSuccess: goToCollectionsList });
  }

  function handleRetry() {
    // eslint-disable-next-line no-void -- fire-and-forget refetch, result intentionally unused
    void refetch();
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <Button aria-label="Back to collections" asChild size="icon-sm" variant="ghost">
          <Link to="/collections" viewTransition>
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {collection?.name ?? (isPending ? 'Loading…' : 'Collection')}
          </h1>
          {collection?.description ? (
            <p className="text-sm text-muted-foreground">{collection.description}</p>
          ) : null}
        </div>
        {collection && isOwner ? (
          <div className="flex shrink-0 items-center gap-1">
            <EditCollectionDialog
              collectionId={collectionId}
              description={collection.description}
              name={collection.name}
              visibility={collection.visibility}
            />
            <Button
              aria-label="Delete collection"
              disabled={deleteCollection.isPending}
              onClick={handleDelete}
              size="icon-sm"
              variant="ghost"
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ) : null}
        {collection && canLeave ? (
          <Button
            disabled={leaveCollection.isPending}
            onClick={handleLeave}
            size="sm"
            variant="outline"
          >
            <LogOut className="size-4" /> Leave
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="space-y-3 rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-destructive">Collection unavailable.</p>
          <Button onClick={handleRetry} variant="secondary">
            Try again
          </Button>
        </div>
      ) : null}

      {!isPending && !error && !collection ? (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            This collection doesn't exist, or you don't have access to it.
          </p>
        </div>
      ) : null}

      {collection ? (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold">
                Items · {items.length} item{items.length === 1 ? '' : 's'}
              </h2>
            </div>
            {items.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">Nothing in this collection yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {items.map((item) => (
                  <div className="flex items-center justify-between gap-4 px-5 py-3" key={item.id}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {item.entityName ?? '(unnamed)'}
                        </span>
                        <Badge variant="secondary">{item.entityType}</Badge>
                      </div>
                      {item.note ? (
                        <p className="truncate text-sm text-muted-foreground">{item.note}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {dateFormatter.format(new Date(item.addedAt))}
                    </span>
                    {canManageItems ? (
                      <Button
                        aria-label="Remove item"
                        disabled={
                          removeItem.isPending &&
                          removeItem.variables?.entityId === item.entityId &&
                          removeItem.variables?.entityType === item.entityType
                        }
                        onClick={() => {
                          if (window.confirm(`Remove ${item.entityName ?? 'this item'}?`)) {
                            removeItem.mutate({
                              entityType: item.entityType,
                              entityId: item.entityId,
                            });
                          }
                        }}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <X className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold">
                Collaborators · {members.length} member{members.length === 1 ? '' : 's'}
              </h2>
              {isOwner ? (
                <InviteMemberDialog collectionId={collectionId} ownEmail={currentUserEmail} />
              ) : null}
            </div>
            <div className="divide-y divide-border">
              {members.map((member) => {
                const isSelf = member.userId === currentUserId;
                const isPendingInvite = !member.acceptedAt;
                const canManage = isOwner && !isSelf && member.role !== 'owner';
                return (
                  <div
                    className="flex items-center justify-between gap-4 px-5 py-3"
                    key={member.id}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm">{memberDisplayName(member)}</span>
                      {isOwner && !isSelf && member.role !== 'owner' ? (
                        <RoleSelect
                          collectionId={collectionId}
                          memberId={member.id}
                          role={member.role}
                        />
                      ) : (
                        <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                          {member.role}
                        </Badge>
                      )}
                      {isPendingInvite ? (
                        <Badge className="gap-1" variant="outline">
                          <Mail className="size-3" /> Pending
                        </Badge>
                      ) : null}
                    </div>
                    {canManage ? (
                      <Button
                        aria-label="Remove collaborator"
                        disabled={
                          removeMember.isPending && removeMember.variables?.memberId === member.id
                        }
                        onClick={() => {
                          if (window.confirm(`Remove ${memberDisplayName(member)}?`)) {
                            removeMember.mutate({ memberId: member.id });
                          }
                        }}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <UserMinus className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

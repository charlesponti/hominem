import { Archive, ArrowLeft, Brain, ChevronRight, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { useArchivedChats, useMonthlyUsage, useUpdateProfile } from '~/hooks/use-account-settings';
import { useDeleteMemory, useMemories, useUpdateMemory } from '~/hooks/use-memories';
import type { User } from '~/lib/auth.server';

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});
const usagePeriodFormatter = new Intl.DateTimeFormat('en-US', {
  month: '2-digit',
  year: '2-digit',
});

function formatUsagePeriod(date: Date): string {
  const parts = usagePeriodFormatter.formatToParts(date);
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  return `${month} '${year}`;
}

function formatUsd(amount: number) {
  return usdFormatter.format(amount);
}

export function AccountSettingsPage({ user }: { user: User }) {
  const navigate = useNavigate();
  const [name, setName] = useState(user.name);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const updateProfile = useUpdateProfile();
  const { data: usage } = useMonthlyUsage();
  const nameChanged = name.trim() !== user.name.trim();
  const usagePercent = usage ? Math.min(100, (usage.totalCostUsd / usage.limitUsd) * 100) : 0;

  async function saveName() {
    const normalizedName = name.trim();
    if (!normalizedName) {
      setSaveMessage('Name cannot be empty.');
      return;
    }

    setSaveMessage(null);
    try {
      await updateProfile.mutateAsync(normalizedName);
      setName(normalizedName);
      setSaveMessage('Saved.');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not save name.');
    }
  }

  function showDeleteNotice() {
    window.alert('Account deletion is not available in this release.');
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <Button aria-label="Back to chat" asChild size="icon-sm" variant="ghost">
          <Link to="/">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Account settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account and chat history.</p>
        </div>
      </div>

      <div className="space-y-8 rounded-xl border border-border bg-card p-5 sm:p-7">
        <section className="space-y-4">
          <h2 className="text-base font-semibold">Identity</h2>
          <label className="block space-y-2 text-xs">
            <span className="text-muted-foreground">Name</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="block space-y-2 text-xs">
            <span className="text-muted-foreground">Email</span>
            <Input readOnly value={user.email} />
          </label>
          {nameChanged ? (
            <Button
              disabled={updateProfile.isPending}
              onClick={() => void saveName()}
              variant="secondary"
            >
              {updateProfile.isPending ? 'Saving…' : 'Save'}
            </Button>
          ) : null}
          {saveMessage ? <p className="text-sm text-muted-foreground">{saveMessage}</p> : null}
        </section>

        {usage ? (
          <section className="space-y-3 border-t border-border pt-6">
            <h2 className="text-base font-semibold">AI usage · {formatUsagePeriod(new Date())}</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold tabular-nums">
                {formatUsd(usage.totalCostUsd)}
              </span>
              <span className="text-sm text-muted-foreground">
                of {formatUsd(usage.limitUsd)} · {usagePercent.toFixed(0)}%
              </span>
            </div>
            <progress
              aria-label={`AI usage: ${usagePercent.toFixed(0)}%`}
              className={`h-2 w-full appearance-none overflow-hidden rounded-full border bg-border [&::-moz-progress-bar]:rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:rounded-full ${usage.isOverLimit ? '[&::-moz-progress-bar]:bg-destructive [&::-webkit-progress-value]:bg-destructive' : '[&::-moz-progress-bar]:bg-foreground [&::-webkit-progress-value]:bg-foreground'}`}
              max={100}
              value={usagePercent}
            />
            <p className="text-sm text-muted-foreground">
              {usage.isOverLimit
                ? "You've reached this month's free AI usage limit. It resets at the start of next month."
                : 'Resets at the start of next month.'}
            </p>
            <Button asChild variant="outline">
              <Link to="/usage">View usage details</Link>
            </Button>
          </section>
        ) : null}

        <section className="space-y-3 border-t border-border pt-6">
          <h2 className="text-base font-semibold">Chats</h2>
          <Button asChild className="w-full justify-between" variant="outline">
            <Link to="/settings/archived-chats">
              <span className="flex items-center gap-2">
                <Archive /> Archived chats
              </span>
              <ChevronRight />
            </Link>
          </Button>
        </section>

        <section className="space-y-3 border-t border-border pt-6">
          <h2 className="text-base font-semibold">Memory</h2>
          <Button asChild className="w-full justify-between" variant="outline">
            <Link to="/settings/memories">
              <span className="flex items-center gap-2">
                <Brain /> Memories
              </span>
              <ChevronRight />
            </Link>
          </Button>
        </section>

        <section className="space-y-3 border-t border-border pt-6">
          <Button
            className="w-full justify-start"
            onClick={() => {
              if (window.confirm('Are you sure you want to sign out?')) navigate('/logout');
            }}
            variant="outline"
          >
            Sign out
          </Button>
          <Button className="w-full justify-start" onClick={showDeleteNotice} variant="destructive">
            <Trash2 /> Delete account
          </Button>
        </section>
      </div>
    </main>
  );
}

export function ArchivedChatsPage() {
  const { data: chats, error, isPending, refetch } = useArchivedChats();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <Button aria-label="Back to account settings" asChild size="icon-sm" variant="ghost">
          <Link to="/settings">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Archived chats</h1>
          <p className="text-sm text-muted-foreground">
            Archived chats remain available here for later reference.
          </p>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-5 sm:p-7">
        {isPending ? (
          <p className="text-sm text-muted-foreground">Loading archived chats…</p>
        ) : null}
        {error ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">Archived chats unavailable.</p>
            <Button onClick={() => void refetch()} variant="secondary">
              Try again
            </Button>
          </div>
        ) : null}
        {!isPending && !error && chats?.length === 0 ? (
          <div className="space-y-1">
            <h2 className="font-medium">No archived chats yet</h2>
            <p className="text-sm text-muted-foreground">
              Chats you archive will appear here for later reference.
            </p>
          </div>
        ) : null}
        {chats?.length ? (
          <div className="divide-y divide-border">
            {chats.map((chat) => (
              <Link
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                key={chat.id}
                to={`/chat/${chat.id}`}
              >
                <Archive className="size-4 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {chat.title || 'Untitled chat'}
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function MemoryRow({ memory }: { memory: { id: string; title: string | null; content: string } }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(memory.title ?? '');
  const [content, setContent] = useState(memory.content);
  const updateMemory = useUpdateMemory();
  const deleteMemory = useDeleteMemory();

  async function save() {
    const trimmedContent = content.trim();
    if (!trimmedContent) return;
    await updateMemory.mutateAsync({
      id: memory.id,
      title: title.trim() || null,
      content: trimmedContent,
    });
    setIsEditing(false);
  }

  function cancel() {
    setTitle(memory.title ?? '');
    setContent(memory.content);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="space-y-2 py-3 first:pt-0 last:pb-0">
        <Input
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title (optional)"
          value={title}
        />
        <Textarea onChange={(event) => setContent(event.target.value)} rows={3} value={content} />
        <div className="flex gap-2">
          <Button
            disabled={updateMemory.isPending || !content.trim()}
            onClick={() => void save()}
            size="sm"
            variant="secondary"
          >
            {updateMemory.isPending ? 'Saving…' : 'Save'}
          </Button>
          <Button onClick={cancel} size="sm" variant="ghost">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <Brain className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        {memory.title ? <p className="text-sm font-medium">{memory.title}</p> : null}
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{memory.content}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          aria-label="Edit memory"
          onClick={() => setIsEditing(true)}
          size="icon-sm"
          variant="ghost"
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          aria-label="Delete memory"
          disabled={deleteMemory.isPending}
          onClick={() => {
            if (window.confirm('Delete this memory?')) deleteMemory.mutate({ id: memory.id });
          }}
          size="icon-sm"
          variant="ghost"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function MemoriesPage() {
  const { data: memories, error, isPending, refetch } = useMemories();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <Button aria-label="Back to account settings" asChild size="icon-sm" variant="ghost">
          <Link to="/settings">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Memories</h1>
          <p className="text-sm text-muted-foreground">
            Facts and preferences the assistant remembers about you.
          </p>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-5 sm:p-7">
        {isPending ? <p className="text-sm text-muted-foreground">Loading memories…</p> : null}
        {error ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">Memories unavailable.</p>
            <Button onClick={() => void refetch()} variant="secondary">
              Try again
            </Button>
          </div>
        ) : null}
        {!isPending && !error && memories?.length === 0 ? (
          <div className="space-y-1">
            <h2 className="font-medium">No memories yet</h2>
            <p className="text-sm text-muted-foreground">
              Facts the assistant saves about you will appear here.
            </p>
          </div>
        ) : null}
        {memories?.length ? (
          <div className="divide-y divide-border">
            {memories.map((memory) => (
              <MemoryRow key={memory.id} memory={memory} />
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}

import { MessageCircle } from 'lucide-react';

import { ChatComposer } from './chat-composer';

interface ChatHomePageProps {
  draft: string;
  isSubmitting: boolean;
  error?: string | null;
  onChangeDraft: (value: string) => void;
  onSubmit: () => void;
}

export function ChatHomePage({
  draft,
  isSubmitting,
  error,
  onChangeDraft,
  onSubmit,
}: ChatHomePageProps) {
  return (
    <main className="mx-auto flex h-full w-full max-w-2xl flex-col justify-end">
      <section className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <MessageCircle aria-hidden="true" className="size-8 text-muted-foreground" />
        <h1 className="text-2xl font-semibold tracking-tight">Start a conversation</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Ask anything, attach a file, or reference one of your notes.
        </p>
      </section>
      <ChatComposer
        draft={draft}
        error={error}
        isSubmitting={isSubmitting}
        onChangeDraft={onChangeDraft}
        onSubmit={onSubmit}
      />
    </main>
  );
}

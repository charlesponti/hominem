import { cn } from '@ponti-studios/ui/utilities';
import { useSyncExternalStore } from 'react';

export type ToastOptions = {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
};

type ToastItem = Required<Pick<ToastOptions, 'title'>> &
  ToastOptions & {
    id: string;
  };

let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return toasts;
}

const EMPTY_TOASTS: ToastItem[] = [];

function getServerSnapshot() {
  return EMPTY_TOASTS;
}

function dismiss(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function toast(options: ToastOptions | string) {
  const resolved = typeof options === 'string' ? { title: options } : options;
  const id = Math.random().toString(36).slice(2, 11);
  const item: ToastItem = {
    id,
    title: resolved.title ?? resolved.description ?? 'Notification',
    description: resolved.description,
    variant: resolved.variant ?? 'default',
    duration: resolved.duration,
  };

  toasts = [...toasts, item];
  emit();

  if (item.duration !== 0) {
    window.setTimeout(() => dismiss(id), item.duration ?? 4000);
  }
}

export function Toaster() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 p-2"
      aria-live="polite"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            'pointer-events-auto rounded-lg border px-4 py-3 shadow-lg',
            item.variant === 'destructive'
              ? 'border-destructive/40 bg-destructive text-destructive-foreground'
              : 'border-border bg-card text-card-foreground',
          )}
          role="status"
        >
          <p className="text-sm font-medium">{item.title}</p>
          {item.description ? <p className="mt-1 text-sm opacity-90">{item.description}</p> : null}
        </div>
      ))}
    </div>
  );
}

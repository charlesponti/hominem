import { FileText } from 'lucide-react';

export function ChatLinkedNoteContext({
  excerpt,
  title,
}: {
  excerpt?: string | null;
  title: string;
}) {
  return (
    <aside aria-label="Linked note context" className="mb-3 rounded-xl border border-border p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <FileText aria-hidden="true" size={16} />
        Discussing {title}
      </div>
      {excerpt ? (
        <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{excerpt}</p>
      ) : null}
    </aside>
  );
}

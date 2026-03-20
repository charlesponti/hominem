export default function NotesHomeSection({
  eyebrow = "Notes",
  title = "Browse notes as one living stream instead of a pile of separate records.",
  description = "The notes view should feel like the same product as home: capture at the top, recent context nearby, and the rest of your writing in one calm chronology."
}: {
  title: string;
  description: string;
  eyebrow: string;
}) {
  return (
    <section className="flex flex-col gap-10">
      <header className="flex flex-col gap-5 border-b border-border/60 pb-6">
        <div className="body-4 uppercase tracking-[0.14em] text-text-tertiary">{eyebrow}</div>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <h1 className="heading-1 whitespace-pre-line text-foreground">{title}</h1>
            <p className="body-2 max-w-2xl text-text-secondary">{description}</p>
          </div>
        </div>
      </header>
    </section>
  );
}

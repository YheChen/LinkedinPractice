/** Milestone-scoped placeholder. Every stub names the milestone that fills it in
 *  so the roadmap is visible in the running app rather than hidden in docs. */
export function Placeholder({
  title,
  milestone,
  children,
}: {
  title: string;
  milestone: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-2xl py-10">
      <p className="mb-2 inline-block rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {milestone}
      </p>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <div className="mt-3 text-ink-muted">{children}</div>
    </section>
  );
}

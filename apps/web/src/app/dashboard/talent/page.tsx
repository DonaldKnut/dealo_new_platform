export default function DashboardTalentPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Talent</p>
        <h1 className="display-title mt-2 text-3xl">Talent pipeline</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Shortlisted professionals, interview stages, and placement readiness — structured for
          recruiter and employer collaboration.
        </p>
      </div>
      <div className="grid gap-4 min-[480px]:grid-cols-2 xl:grid-cols-3">
        {['Screening', 'Shortlisted', 'Interviewing', 'Offer', 'Placed', 'On hold'].map((stage) => (
          <article key={stage} className="rounded-2xl border border-border bg-surface-elevated/70 p-5">
            <p className="text-sm font-semibold text-brand">{stage}</p>
            <p className="mt-3 font-display text-3xl text-foreground">—</p>
            <p className="mt-2 text-xs text-muted">Live counts connect in the next data phase.</p>
          </article>
        ))}
      </div>
    </div>
  );
}

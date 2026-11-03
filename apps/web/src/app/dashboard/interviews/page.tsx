export default function TalentInterviewsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Interviews</p>
        <h1 className="display-title mt-2 text-3xl">Interview schedule</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Screening calls and employer interviews will list here when recruiters book them.
        </p>
      </div>
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
        No interviews scheduled.
      </div>
    </div>
  );
}

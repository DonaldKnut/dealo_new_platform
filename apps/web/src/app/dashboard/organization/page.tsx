export default function DashboardOrganizationPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Organization</p>
        <h1 className="display-title mt-2 text-3xl">Company workspace</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Manage membership, hiring ownership, and how Dealo collaborates with your team.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-surface-elevated/70 p-6">
        <h2 className="font-display text-xl">Members</h2>
        <p className="mt-2 text-sm text-muted">
          Invite hiring managers and collaborators. Organization membership ships with the next
          employer portal phase.
        </p>
        <button type="button" className="btn-secondary mt-5" disabled>
          Invite member
        </button>
      </div>
    </div>
  );
}

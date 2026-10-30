export default function DashboardSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Settings</p>
        <h1 className="display-title mt-2 text-3xl">Account & preferences</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Profile, notification preferences, and security controls for your Dealo workspace.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface-elevated/70 p-6">
          <h2 className="font-display text-xl">Profile</h2>
          <p className="mt-2 text-sm text-muted">Name, email, and role preferences.</p>
        </section>
        <section className="rounded-2xl border border-border bg-surface-elevated/70 p-6">
          <h2 className="font-display text-xl">Security</h2>
          <p className="mt-2 text-sm text-muted">Password reset, session control, and Google link status.</p>
        </section>
      </div>
    </div>
  );
}

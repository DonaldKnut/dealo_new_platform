import { Suspense } from 'react';

import { AuthIssueFromUrl } from '@/components/auth/auth-issue-dialog';
import { AuthShell } from '@/components/auth/auth-shell';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <AuthIssueFromUrl />
      </Suspense>
      {children}
    </AuthShell>
  );
}

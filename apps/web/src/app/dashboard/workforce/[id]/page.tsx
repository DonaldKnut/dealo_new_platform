import { WorkforceConsole } from '@/components/dashboard/workforce-console';

export default async function WorkforceSitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkforceConsole siteId={id} />;
}

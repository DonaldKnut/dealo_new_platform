import { AtsBoard } from '@/components/ats/ats-board';

export default async function AtsJobBoardPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  return <AtsBoard jobId={jobId} />;
}

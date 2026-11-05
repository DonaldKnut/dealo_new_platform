import { AtsJobEditor } from '@/components/ats/ats-job-editor';

export default async function EditAtsJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  return <AtsJobEditor jobId={jobId} />;
}

import { ResumeBuilder } from '@/components/resume/resume-builder';

export default async function DashboardEditResumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResumeBuilder id={id} basePath="/dashboard/resumes" embedded />;
}

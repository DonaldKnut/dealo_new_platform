import { ResumeBuilder } from '@/components/resume/resume-builder';

export default function DashboardNewCoverLetterPage() {
  return <ResumeBuilder kind="COVER_LETTER" basePath="/dashboard/resumes" embedded />;
}

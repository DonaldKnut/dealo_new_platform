import { ResumeBuilder } from '@/components/resume/resume-builder';

export default function DashboardNewResumePage() {
  return <ResumeBuilder kind="RESUME" basePath="/dashboard/resumes" embedded />;
}

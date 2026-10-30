'use client';

import { ContactForm } from '@/components/forms/contact-form';
import { ForgotPasswordForm } from '@/components/forms/forgot-password-form';
import { LoginForm } from '@/components/forms/login-form';
import { RegisterForm } from '@/components/forms/register-form';
import { HireInquiryForm } from '@/components/hire-inquiry-form';
import {
  AuthIllustration,
  ContactIllustration,
  HireIllustration,
} from '@/components/illustrations/modal-art';

import { FormModalShell } from './form-modal-shell';
import { useModal } from './modal-context';

export function ModalHost() {
  const { openModal, close } = useModal();

  return (
    <>
      <FormModalShell
        open={openModal === 'hire'}
        onClose={close}
        title="Tell us who you need"
        subtitle="Share the role brief. Dealo reviews, sources, and guides the placement process."
        illustration={<HireIllustration />}
      >
        <HireInquiryForm />
      </FormModalShell>

      <FormModalShell
        open={openModal === 'login'}
        onClose={close}
        title="Welcome back"
        subtitle="Sign in to your employer or talent workspace."
        illustration={<AuthIllustration />}
      >
        <LoginForm />
      </FormModalShell>

      <FormModalShell
        open={openModal === 'register'}
        onClose={close}
        title="Create your account"
        subtitle="Join as an employer or professional. Verification keeps the network trusted."
        illustration={<AuthIllustration />}
      >
        <RegisterForm />
      </FormModalShell>

      <FormModalShell
        open={openModal === 'forgot-password'}
        onClose={close}
        title="Reset your password"
        subtitle="We'll email you a secure link if an account exists for that address."
        illustration={<AuthIllustration />}
      >
        <ForgotPasswordForm />
      </FormModalShell>

      <FormModalShell
        open={openModal === 'contact'}
        onClose={close}
        title="Talk to Dealo"
        subtitle="Questions about recruitment, staffing, or partnership — send a clear brief."
        illustration={<ContactIllustration />}
      >
        <ContactForm />
      </FormModalShell>
    </>
  );
}

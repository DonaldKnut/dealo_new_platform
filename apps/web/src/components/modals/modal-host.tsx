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
        subtitle="Tell us about the job. Dealo finds people and helps you hire."
        promoFill
        illustration={<HireIllustration />}
      >
        <HireInquiryForm />
      </FormModalShell>

      <FormModalShell
        open={openModal === 'login'}
        onClose={close}
        title="Welcome back"
        subtitle="Sign in as a company or a worker."
        promoFill
        illustration={<AuthIllustration />}
      >
        <LoginForm />
      </FormModalShell>

      <FormModalShell
        open={openModal === 'register'}
        onClose={close}
        title="Create your account"
        subtitle="Join as a company or a worker. We check every account to keep Dealo safe."
        promoFill
        illustration={<AuthIllustration />}
      >
        <RegisterForm />
      </FormModalShell>

      <FormModalShell
        open={openModal === 'forgot-password'}
        onClose={close}
        title="Reset your password"
        subtitle="If we have an account with that email, we will send you a safe link."
        promoFill
        illustration={<AuthIllustration />}
      >
        <ForgotPasswordForm />
      </FormModalShell>

      <FormModalShell
        open={openModal === 'contact'}
        onClose={close}
        title="Talk to Dealo"
        subtitle="Have a question about hiring or working with us? Send a short message."
        illustration={<ContactIllustration />}
      >
        <ContactForm />
      </FormModalShell>
    </>
  );
}

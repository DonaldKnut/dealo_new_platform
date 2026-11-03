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
        subtitle="Tell us about the role. Dealo finds people and helps you hire."
        promoFill
        illustration={<HireIllustration />}
      >
        <HireInquiryForm />
      </FormModalShell>

      <FormModalShell
        open={openModal === 'login'}
        onClose={close}
        title="Welcome back"
        subtitle="Sign in as a company or a professional."
        promoFill
        illustration={<AuthIllustration />}
      >
        <LoginForm />
      </FormModalShell>

      <FormModalShell
        open={openModal === 'register'}
        onClose={close}
        title="Create your account"
        subtitle="Join as a company or a professional. We verify accounts to keep Dealo trusted."
        promoFill
        illustration={<AuthIllustration />}
      >
        <RegisterForm />
      </FormModalShell>

      <FormModalShell
        open={openModal === 'forgot-password'}
        onClose={close}
        title="Reset your password"
        subtitle="We'll email you a secure link if an account exists for that address."
        promoFill
        illustration={<AuthIllustration />}
      >
        <ForgotPasswordForm />
      </FormModalShell>

      <FormModalShell
        open={openModal === 'contact'}
        onClose={close}
        title="Talk to Dealo"
        subtitle="Questions about hiring, staffing, or working with us? Send a short message."
        illustration={<ContactIllustration />}
      >
        <ContactForm />
      </FormModalShell>
    </>
  );
}

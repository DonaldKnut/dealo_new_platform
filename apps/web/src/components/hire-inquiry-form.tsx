'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ServiceType,
  WorkArrangement,
  hireInquirySchema,
  type HireInquiryInput,
} from '@dealo/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { FormField } from '@/components/forms/form-field';
import { FormStatus } from '@/components/forms/form-status';
import { useServerFormStatus } from '@/hooks/use-server-form-status';
import { ApiError, apiFetch } from '@/lib/api';

const hireFormObjectSchema = z.object({
  companyName: z.string().trim().min(2, 'Enter your company name').max(200),
  contactName: z.string().trim().min(2, 'Enter a contact name').max(150),
  email: z.string().email('Enter a valid work email').max(255),
  phone: z.string().trim().min(7, 'Enter a valid phone number').max(30),
  serviceType: z.enum([ServiceType.DIRECT_RECRUITMENT, ServiceType.MANAGED_STAFFING]),
  roleTitle: z.string().trim().min(2, 'Enter a role title').max(200),
  numberOfProfessionals: z.coerce.number().int().min(1).max(500),
  location: z.string().trim().min(2, 'Enter a location').max(200),
  workArrangement: z.enum([
    WorkArrangement.ONSITE,
    WorkArrangement.HYBRID,
    WorkArrangement.REMOTE,
  ]),
  expectedStartDate: z.string().optional(),
  compensationMinNgn: z.coerce.number().nonnegative().optional(),
  compensationMaxNgn: z.coerce.number().nonnegative().optional(),
  currency: z.string().length(3),
  durationNotes: z.string().trim().max(1000).optional(),
  requirements: z.string().trim().min(20, 'Add at least 20 characters of requirements').max(5000),
  additionalNotes: z.string().trim().max(2000).optional(),
});

const hireFormSchema = hireFormObjectSchema.superRefine((data, ctx) => {
  if (
    data.compensationMinNgn !== undefined &&
    data.compensationMaxNgn !== undefined &&
    data.compensationMaxNgn < data.compensationMinNgn
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['compensationMaxNgn'],
      message: 'Maximum compensation must be greater than or equal to minimum',
    });
  }

  if (data.serviceType === ServiceType.MANAGED_STAFFING && !data.durationNotes?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['durationNotes'],
      message: 'Expected duration or engagement notes are required for managed staffing',
    });
  }
});

type HireFormValues = z.infer<typeof hireFormSchema>;

const step1Schema = hireFormObjectSchema.pick({
  companyName: true,
  contactName: true,
  email: true,
  phone: true,
});

const step2BaseSchema = hireFormObjectSchema.pick({
  serviceType: true,
  roleTitle: true,
  numberOfProfessionals: true,
  location: true,
  workArrangement: true,
  durationNotes: true,
});

const step3Schema = hireFormObjectSchema.pick({
  expectedStartDate: true,
  compensationMinNgn: true,
  compensationMaxNgn: true,
  requirements: true,
  additionalNotes: true,
  currency: true,
});

const STEPS = [
  { id: 1, label: 'Contact', title: 'Who should we reach?' },
  { id: 2, label: 'Role', title: 'What do you need?' },
  { id: 3, label: 'Brief', title: 'Role requirements' },
] as const;

const FIELD_HELP = {
  companyName: 'Legal or trading name of the company or organization requesting talent.',
  contactName: 'Full name of the person Dealo should communicate with about this request.',
  email: 'Official work email where confirmations, shortlists, and updates should be sent.',
  phone: 'Mobile or office number we can use for quick clarifications.',
  serviceType:
    'Direct recruitment: hire into your structure (brief → source → screen → shortlist → interview → place). Managed staffing: Dealo handles hiring/staffing operations for you under an agreed arrangement.',
  roleTitle: 'Job title or position name you need filled, e.g. Executive Assistant.',
  numberOfProfessionals: 'How many people you need for this role or engagement.',
  location: 'City/state where the professional will work, e.g. Lagos, Nigeria.',
  workArrangement: 'Whether the role is onsite, hybrid, or fully remote.',
  expectedStartDate: 'Preferred date the professional should begin, if known.',
  durationNotes: 'For managed staffing: expected duration, renewals, or engagement notes.',
  compensationMinNgn: 'Lowest monthly compensation you expect to offer (in Naira).',
  compensationMaxNgn: 'Highest monthly compensation you are willing to offer (in Naira).',
  requirements: 'Responsibilities, experience, skills, certifications, and must-have criteria.',
  additionalNotes: 'Anything else that helps Dealo understand your hiring need.',
} as const;

export function HireInquiryForm({ onSuccess }: { onSuccess?: () => void }) {
  const [step, setStep] = useState(1);
  const { serverError, serverMessage, setServerError, setServerMessage, clear } =
    useServerFormStatus();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<HireFormValues>({
    resolver: zodResolver(hireFormSchema),
    mode: 'onChange',
    defaultValues: {
      serviceType: ServiceType.DIRECT_RECRUITMENT,
      workArrangement: WorkArrangement.ONSITE,
      numberOfProfessionals: 1,
      currency: 'NGN',
      location: 'Lagos, Nigeria',
    },
  });

  const values = watch();
  const serviceType = values.serviceType;

  const stepValid = useMemo(() => {
    if (step === 1) return step1Schema.safeParse(values).success;
    if (step === 2) {
      const parsed = step2BaseSchema.safeParse(values);
      if (!parsed.success) return false;
      if (values.serviceType === ServiceType.MANAGED_STAFFING && !values.durationNotes?.trim()) {
        return false;
      }
      return true;
    }
    return step3Schema.safeParse(values).success && hireFormSchema.safeParse(values).success;
  }, [step, values]);

  const goNext = async () => {
    const fields =
      step === 1
        ? (['companyName', 'contactName', 'email', 'phone'] as const)
        : step === 2
          ? ([
              'serviceType',
              'roleTitle',
              'numberOfProfessionals',
              'location',
              'workArrangement',
              'durationNotes',
            ] as const)
          : null;

    if (fields) {
      const ok = await trigger([...fields]);
      if (!ok) return;
      if (step === 2 && getValues('serviceType') === ServiceType.MANAGED_STAFFING) {
        const notesOk = await trigger('durationNotes');
        if (!notesOk || !getValues('durationNotes')?.trim()) return;
      }
    }
    setStep((current) => Math.min(3, current + 1));
  };

  const onSubmit = handleSubmit(async (formValues) => {
    clear();

    try {
      const payload: HireInquiryInput = hireInquirySchema.parse({
        companyName: formValues.companyName,
        contactName: formValues.contactName,
        email: formValues.email,
        phone: formValues.phone,
        serviceType: formValues.serviceType,
        roleTitle: formValues.roleTitle,
        numberOfProfessionals: formValues.numberOfProfessionals,
        location: formValues.location,
        workArrangement: formValues.workArrangement,
        expectedStartDate: formValues.expectedStartDate || undefined,
        compensationMinMinor:
          formValues.compensationMinNgn !== undefined
            ? Math.round(formValues.compensationMinNgn * 100)
            : undefined,
        compensationMaxMinor:
          formValues.compensationMaxNgn !== undefined
            ? Math.round(formValues.compensationMaxNgn * 100)
            : undefined,
        currency: formValues.currency,
        durationNotes: formValues.durationNotes,
        requirements: formValues.requirements,
        additionalNotes: formValues.additionalNotes,
      });

      const result = await apiFetch<{ message: string }>('/hire-inquiries', {
        method: 'POST',
        json: payload,
      });
      setServerMessage(result.message);
      onSuccess?.();
      reset({
        serviceType: ServiceType.DIRECT_RECRUITMENT,
        workArrangement: WorkArrangement.ONSITE,
        numberOfProfessionals: 1,
        currency: 'NGN',
        location: 'Lagos, Nigeria',
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        roleTitle: '',
        requirements: '',
        additionalNotes: '',
        durationNotes: '',
        expectedStartDate: '',
        compensationMinNgn: undefined,
        compensationMaxNgn: undefined,
      });
      setStep(1);
    } catch (error) {
      if (error instanceof ApiError) {
        setServerError(error.message);
      } else {
        setServerError('Unable to submit your request right now. Please try again.');
      }
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5 min-[340px]:space-y-6" noValidate>
      <div className="flex items-center gap-2">
        {STEPS.map((item, index) => {
          const active = step === item.id;
          const done = step > item.id;
          return (
            <div key={item.id} className="flex min-w-0 flex-1 items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
                  done
                    ? 'bg-brand text-white dark:text-[#071f14]'
                    : active
                      ? 'border-2 border-brand text-brand'
                      : 'border border-border text-muted'
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : item.id}
              </div>
              <span
                className={`hidden truncate text-xs font-medium min-[400px]:inline ${
                  active ? 'text-foreground' : 'text-muted'
                }`}
              >
                {item.label}
              </span>
              {index < STEPS.length - 1 ? (
                <div
                  className={`mx-1 hidden h-px flex-1 min-[480px]:block ${
                    done ? 'bg-brand' : 'bg-border'
                  }`}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <div>
        <p className="eyebrow">Step {step} of 3</p>
        <h3 className="mt-1 font-display text-xl text-foreground">{STEPS[step - 1].title}</h3>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.22 }}
          className="space-y-4"
        >
          {step === 1 ? (
            <div className="grid gap-4 min-[480px]:grid-cols-2 min-[480px]:gap-5">
              <FormField label="Company name" help={FIELD_HELP.companyName} error={errors.companyName?.message}>
                <input className="input-field" {...register('companyName')} />
              </FormField>
              <FormField label="Contact name" help={FIELD_HELP.contactName} error={errors.contactName?.message}>
                <input className="input-field" {...register('contactName')} />
              </FormField>
              <FormField label="Work email" help={FIELD_HELP.email} error={errors.email?.message}>
                <input type="email" className="input-field" {...register('email')} />
              </FormField>
              <FormField label="Phone" help={FIELD_HELP.phone} error={errors.phone?.message}>
                <input className="input-field" {...register('phone')} />
              </FormField>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-4 min-[480px]:grid-cols-2 min-[480px]:gap-5">
              <FormField label="Service type" help={FIELD_HELP.serviceType} error={errors.serviceType?.message}>
                <select className="input-field" {...register('serviceType')}>
                  <option value={ServiceType.DIRECT_RECRUITMENT}>Direct recruitment / placement</option>
                  <option value={ServiceType.MANAGED_STAFFING}>Managed staffing</option>
                </select>
              </FormField>
              <FormField label="Role title" help={FIELD_HELP.roleTitle} error={errors.roleTitle?.message}>
                <input
                  className="input-field"
                  placeholder="e.g. Executive Assistant"
                  {...register('roleTitle')}
                />
              </FormField>
              <FormField
                label="Number of professionals"
                help={FIELD_HELP.numberOfProfessionals}
                error={errors.numberOfProfessionals?.message}
              >
                <input
                  type="number"
                  min={1}
                  className="input-field"
                  {...register('numberOfProfessionals')}
                />
              </FormField>
              <FormField label="Preferred location" help={FIELD_HELP.location} error={errors.location?.message}>
                <input className="input-field" {...register('location')} />
              </FormField>
              <FormField
                label="Work arrangement"
                help={FIELD_HELP.workArrangement}
                error={errors.workArrangement?.message}
              >
                <select className="input-field" {...register('workArrangement')}>
                  <option value={WorkArrangement.ONSITE}>Onsite</option>
                  <option value={WorkArrangement.HYBRID}>Hybrid</option>
                  <option value={WorkArrangement.REMOTE}>Remote</option>
                </select>
              </FormField>
              {serviceType === ServiceType.MANAGED_STAFFING ? (
                <div className="min-[480px]:col-span-2">
                  <FormField
                    label="Engagement duration / staffing notes"
                    help={FIELD_HELP.durationNotes}
                    error={errors.durationNotes?.message}
                  >
                    <textarea rows={3} className="input-field" {...register('durationNotes')} />
                  </FormField>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div className="grid gap-4 min-[480px]:grid-cols-2 min-[480px]:gap-5">
                <FormField
                  label="Expected start date"
                  help={FIELD_HELP.expectedStartDate}
                  error={errors.expectedStartDate?.message}
                >
                  <input type="date" className="input-field" {...register('expectedStartDate')} />
                </FormField>
                <div className="hidden min-[480px]:block" />
                <FormField
                  label="Compensation min (NGN / month)"
                  help={FIELD_HELP.compensationMinNgn}
                  error={errors.compensationMinNgn?.message}
                >
                  <input
                    type="number"
                    min={0}
                    className="input-field"
                    placeholder="e.g. 250000"
                    {...register('compensationMinNgn')}
                  />
                </FormField>
                <FormField
                  label="Compensation max (NGN / month)"
                  help={FIELD_HELP.compensationMaxNgn}
                  error={errors.compensationMaxNgn?.message}
                >
                  <input
                    type="number"
                    min={0}
                    className="input-field"
                    placeholder="e.g. 400000"
                    {...register('compensationMaxNgn')}
                  />
                </FormField>
              </div>
              <FormField
                label="Role requirements"
                help={FIELD_HELP.requirements}
                error={errors.requirements?.message}
              >
                <textarea
                  rows={4}
                  className="input-field"
                  placeholder="Describe responsibilities, experience, skills, and any must-haves."
                  {...register('requirements')}
                />
              </FormField>
              <FormField
                label="Additional notes"
                help={FIELD_HELP.additionalNotes}
                error={errors.additionalNotes?.message}
              >
                <textarea rows={3} className="input-field" {...register('additionalNotes')} />
              </FormField>
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <FormStatus error={serverError} message={serverMessage} />

      <div className="flex flex-col-reverse gap-2 min-[400px]:flex-row min-[400px]:justify-between">
        {step > 1 ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setStep((current) => Math.max(1, current - 1))}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        ) : (
          <span />
        )}

        {step < 3 ? (
          <button type="button" className="btn-primary" disabled={!stepValid} onClick={goNext}>
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button type="submit" className="btn-primary" disabled={!stepValid || isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Submit hiring request'}
          </button>
        )}
      </div>
    </form>
  );
}

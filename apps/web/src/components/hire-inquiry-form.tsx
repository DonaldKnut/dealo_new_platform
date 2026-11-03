'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  RoleFamily,
  ServiceType,
  WorkArrangement,
  hireInquirySchema,
  type HireInquiryInput,
} from '@dealo/shared';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  HardHat,
  Handshake,
  Home,
  MapPin,
  Wifi,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';

import { DatePickerField } from '@/components/forms/date-picker-field';
import { FormField } from '@/components/forms/form-field';
import { FormStatus } from '@/components/forms/form-status';
import {
  IllustrativeOptionPicker,
  type IllustrativeOption,
} from '@/components/forms/illustrative-option-picker';
import { TypewriterTip } from '@/components/forms/typewriter-tip';
import { RoleAutocomplete } from '@/components/ui/role-autocomplete';
import { useToast } from '@/components/ui/toast';
import { useServerFormStatus } from '@/hooks/use-server-form-status';
import { ApiError, apiFetch } from '@/lib/api';
import { logClientAudit } from '@/lib/client-audit';

const hireFormObjectSchema = z.object({
  companyName: z.string().trim().min(2, 'Enter your company name').max(200),
  contactName: z.string().trim().min(2, 'Enter a contact name').max(150),
  email: z.string().email('Enter a valid work email').max(255),
  phone: z.string().trim().min(7, 'Enter a valid phone number').max(30),
  roleFamily: z.enum([RoleFamily.OFFICE_PROFESSIONAL, RoleFamily.SKILLED_TRADE]),
  serviceType: z.enum([ServiceType.DIRECT_RECRUITMENT, ServiceType.MANAGED_STAFFING]),
  roleTitle: z
    .string()
    .trim()
    .min(2, 'Enter a role title')
    .max(200)
    .refine((value) => !/\d/.test(value), {
      message: 'Role title should not include numbers',
    }),
  numberOfProfessionals: z.coerce.number().int().min(1).max(500),
  location: z.string().trim().min(2, 'Enter a location').max(200),
  workArrangement: z.enum([
    WorkArrangement.ONSITE,
    WorkArrangement.HYBRID,
    WorkArrangement.REMOTE,
  ]),
  expectedStartDate: z.string().optional(),
  compensationMinNgn: z.preprocess(
    (value) => (value === '' || value === null || Number.isNaN(value) ? undefined : value),
    z.coerce.number().nonnegative().optional(),
  ),
  compensationMaxNgn: z.preprocess(
    (value) => (value === '' || value === null || Number.isNaN(value) ? undefined : value),
    z.coerce.number().nonnegative().optional(),
  ),
  currency: z.string().length(3),
  durationNotes: z.string().trim().max(1000).optional(),
  requirements: z
    .string()
    .trim()
    .min(8, 'One short sentence is enough (at least 8 characters)')
    .max(5000),
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

  const needsDuration =
    data.serviceType === ServiceType.MANAGED_STAFFING ||
    data.roleFamily === RoleFamily.SKILLED_TRADE;

  if (needsDuration && !data.durationNotes?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['durationNotes'],
      message:
        data.roleFamily === RoleFamily.SKILLED_TRADE
          ? 'Contract length or site duration is required for skilled trades'
          : 'Expected duration or engagement notes are required for managed staffing',
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
  roleFamily: true,
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
  { id: 3, label: 'Details', title: 'Anything else we should know?' },
] as const;

const FIELD_HELP = {
  companyName: 'The company name you use publicly.',
  contactName: 'Who should we talk to about this hire?',
  email: 'Work email for updates and shortlists.',
  phone: 'Phone number for quick questions.',
  roleFamily:
    'Office & professional: admin, finance, tech, and similar. Skilled trades: bricklaying, electrical, plumbing, welding, carpentry, site supervision — usually contract or project-based.',
  serviceType:
    'Direct recruitment: hire onto your company payroll. Managed staffing: Dealo finds and manages people under agreed contract terms — strong fit for trade crews and project work.',
  roleTitle: 'Job title in words only — e.g. Executive Assistant or Bricklayer. No numbers.',
  numberOfProfessionals: 'How many people do you need?',
  location: 'Where will they work? e.g. Lagos, Nigeria. Trades are usually site-based.',
  workArrangement:
    'Office roles can be onsite, hybrid, or remote. Skilled trades are usually onsite (or hybrid for site + workshop).',
  expectedStartDate: 'Optional. Rough timing helps us prioritize — leave blank if unsure.',
  durationNotes:
    'Contract or engagement length — e.g. 3 months on site, project until completion, or ongoing managed staffing.',
  compensationMinNgn:
    'Optional. Lowest pay you can offer (NGN). Monthly for office; daily/weekly/project for trades.',
  compensationMaxNgn: 'Optional. Highest pay on the same basis as the minimum.',
  requirements:
    'A short note is enough for now — skills, experience, or site needs. We will deepen this with you after.',
  additionalNotes: 'Optional. Shifts, PPE, lodging, tools, or reporting structure.',
} as const;

const ROLE_FAMILY_OPTIONS: IllustrativeOption[] = [
  {
    value: RoleFamily.OFFICE_PROFESSIONAL,
    label: 'Office & professional',
    description: 'Admin, finance, engineering, HR, and similar desk roles',
    icon: BriefcaseBusiness,
  },
  {
    value: RoleFamily.SKILLED_TRADE,
    label: 'Skilled trade',
    description: 'Bricklaying, electrical, plumbing, welding, carpentry, site work',
    icon: HardHat,
  },
];

const SERVICE_TYPE_OPTIONS: IllustrativeOption[] = [
  {
    value: ServiceType.DIRECT_RECRUITMENT,
    label: 'Hire onto my company',
    description: 'Checked shortlist → interview → place on your payroll',
    icon: Building2,
  },
  {
    value: ServiceType.MANAGED_STAFFING,
    label: 'Dealo manages staffing',
    description: 'Contract cover with Dealo handling hiring admin',
    icon: Handshake,
  },
];

const WORK_ARRANGEMENT_OFFICE: IllustrativeOption[] = [
  {
    value: WorkArrangement.ONSITE,
    label: 'Onsite',
    description: 'Work from your office or assigned location',
    icon: MapPin,
  },
  {
    value: WorkArrangement.HYBRID,
    label: 'Hybrid',
    description: 'Mix of office days and remote days',
    icon: Home,
  },
  {
    value: WorkArrangement.REMOTE,
    label: 'Remote',
    description: 'Fully remote within agreed locations',
    icon: Wifi,
  },
];

const WORK_ARRANGEMENT_TRADE: IllustrativeOption[] = [
  {
    value: WorkArrangement.ONSITE,
    label: 'Onsite / on location',
    description: 'Primary work happens on site',
    icon: MapPin,
  },
  {
    value: WorkArrangement.HYBRID,
    label: 'Hybrid (site + workshop)',
    description: 'Site days plus workshop or yard time',
    icon: Home,
  },
];

export function HireInquiryForm({ onSuccess }: { onSuccess?: () => void }) {
  const [step, setStep] = useState(1);
  const toast = useToast();
  const { serverError, serverMessage, setServerError, setServerMessage, clear } =
    useServerFormStatus();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    trigger,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<HireFormValues>({
    resolver: zodResolver(hireFormSchema) as Resolver<HireFormValues>,
    mode: 'onChange',
    defaultValues: {
      roleFamily: RoleFamily.OFFICE_PROFESSIONAL,
      serviceType: ServiceType.DIRECT_RECRUITMENT,
      workArrangement: WorkArrangement.ONSITE,
      numberOfProfessionals: 1,
      currency: 'NGN',
      location: 'Lagos, Nigeria',
    },
  });

  const values = watch();
  const serviceType = values.serviceType;
  const roleFamily = values.roleFamily;
  const isTrade = roleFamily === RoleFamily.SKILLED_TRADE;
  const needsDuration =
    serviceType === ServiceType.MANAGED_STAFFING || roleFamily === RoleFamily.SKILLED_TRADE;

  useEffect(() => {
    if (!isTrade) return;
    if (values.workArrangement === WorkArrangement.REMOTE) {
      setValue('workArrangement', WorkArrangement.ONSITE, { shouldValidate: true });
    }
  }, [isTrade, setValue, values.workArrangement]);

  const stepValid = useMemo(() => {
    if (step === 1) return step1Schema.safeParse(values).success;
    if (step === 2) {
      const parsed = step2BaseSchema.safeParse(values);
      if (!parsed.success) return false;
      if (needsDuration && !values.durationNotes?.trim()) return false;
      return true;
    }
    return step3Schema.safeParse(values).success && hireFormSchema.safeParse(values).success;
  }, [needsDuration, step, values]);

  const goNext = async () => {
    const fields =
      step === 1
        ? (['companyName', 'contactName', 'email', 'phone'] as const)
        : step === 2
          ? ([
              'roleFamily',
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
      if (step === 2) {
        const current = getValues();
        const durationRequired =
          current.serviceType === ServiceType.MANAGED_STAFFING ||
          current.roleFamily === RoleFamily.SKILLED_TRADE;
        if (durationRequired) {
          const notesOk = await trigger('durationNotes');
          if (!notesOk || !getValues('durationNotes')?.trim()) return;
        }
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
        roleFamily: formValues.roleFamily,
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
      toast.success('Request received', result.message);
      logClientAudit({
        action: 'HIRE_INQUIRY_SUBMITTED_UI',
        entityType: 'HireInquiry',
        metadata: { roleTitle: formValues.roleTitle },
      });
      onSuccess?.();
      reset({
        roleFamily: RoleFamily.OFFICE_PROFESSIONAL,
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
        toast.error('Request failed', error.message);
      } else {
        setServerError('Unable to submit your request right now. Please try again.');
        toast.error('Request failed', 'Unable to submit your request right now.');
      }
    }
  });

  const roleTip = isTrade
    ? 'Skilled trades usually need a contract length, a site location, and onsite (or site + workshop) work.'
    : 'Office & professional roles can be permanent hire or managed staffing — onsite, hybrid, or remote.';

  const arrangementOptions = isTrade ? WORK_ARRANGEMENT_TRADE : WORK_ARRANGEMENT_OFFICE;

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 min-[230px]:space-y-5 min-[340px]:space-y-6"
      noValidate
    >
      <div className="flex items-center gap-1.5 min-[340px]:gap-2">
        {STEPS.map((item, index) => {
          const active = step === item.id;
          const done = step > item.id;
          return (
            <div key={item.id} className="flex min-w-0 flex-1 items-center gap-1.5 min-[340px]:gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition min-[340px]:h-8 min-[340px]:w-8 min-[340px]:text-xs ${
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
                className={`hidden truncate text-[11px] font-medium min-[360px]:inline min-[400px]:text-xs ${
                  active ? 'text-foreground' : 'text-muted'
                }`}
              >
                {item.label}
              </span>
              {index < STEPS.length - 1 ? (
                <div
                  className={`mx-0.5 hidden h-px flex-1 min-[480px]:block ${
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
        <h3 className="mt-1 font-display text-lg text-foreground min-[340px]:text-xl">
          {STEPS[step - 1].title}
        </h3>
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
            <div className="grid gap-3 min-[230px]:gap-4 min-[480px]:grid-cols-2 min-[480px]:gap-5">
              <FormField
                label="Role type"
                help={FIELD_HELP.roleFamily}
                error={errors.roleFamily?.message}
              >
                <IllustrativeOptionPicker
                  value={roleFamily}
                  options={ROLE_FAMILY_OPTIONS}
                  onChange={(next) =>
                    setValue('roleFamily', next as HireFormValues['roleFamily'], {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                />
              </FormField>
              <FormField
                label="Service type"
                help={FIELD_HELP.serviceType}
                error={errors.serviceType?.message}
              >
                <IllustrativeOptionPicker
                  value={serviceType}
                  options={SERVICE_TYPE_OPTIONS}
                  onChange={(next) =>
                    setValue('serviceType', next as HireFormValues['serviceType'], {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                />
              </FormField>

              <div className="min-[480px]:col-span-2">
                <TypewriterTip key={roleTip} text={roleTip} />
              </div>

              <FormField
                label="Role title"
                help={FIELD_HELP.roleTitle}
                error={errors.roleTitle?.message}
                className="min-[480px]:col-span-2"
              >
                <RoleAutocomplete
                  value={values.roleTitle ?? ''}
                  family={roleFamily}
                  placeholder={
                    isTrade
                      ? 'e.g. Bricklayer, Electrician, Welder'
                      : 'e.g. Executive Assistant, Accountant'
                  }
                  onChange={(next) =>
                    setValue('roleTitle', next, { shouldValidate: true, shouldDirty: true })
                  }
                  onBlur={() => void trigger('roleTitle')}
                />
              </FormField>

              <FormField
                label={isTrade ? 'Headcount needed' : 'Number of professionals'}
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
              <FormField
                label={isTrade ? 'Site / work location' : 'Preferred location'}
                help={FIELD_HELP.location}
                error={errors.location?.message}
              >
                <input
                  className="input-field"
                  placeholder={isTrade ? 'e.g. Lekki Phase 1 site, Lagos' : 'e.g. Lagos, Nigeria'}
                  {...register('location')}
                />
              </FormField>

              <FormField
                label="Work arrangement"
                help={FIELD_HELP.workArrangement}
                error={errors.workArrangement?.message}
                className="min-[480px]:col-span-2"
              >
                <IllustrativeOptionPicker
                  value={values.workArrangement}
                  options={arrangementOptions}
                  onChange={(next) =>
                    setValue('workArrangement', next as HireFormValues['workArrangement'], {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                />
              </FormField>

              {needsDuration ? (
                <div className="min-[480px]:col-span-2">
                  <FormField
                    label={isTrade ? 'Contract / site duration' : 'How long do you need them?'}
                    help={FIELD_HELP.durationNotes}
                    error={errors.durationNotes?.message}
                  >
                    <textarea
                      rows={3}
                      className="input-field min-h-[4.5rem] resize-y"
                      placeholder={
                        isTrade
                          ? 'e.g. 8-week blockwork contract, or until foundation phase completes'
                          : 'e.g. 6-month managed cover, renewable'
                      }
                      {...register('durationNotes')}
                    />
                  </FormField>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <p className="rounded-xl border border-border/70 bg-surface/70 px-3 py-2.5 text-[11px] leading-relaxed text-muted min-[340px]:text-xs">
                Only the short note below is required to submit. Start date, pay, and extra notes
                help — but you can skip them and we&apos;ll follow up.
              </p>

              <FormField
                label="What do you need?"
                help={FIELD_HELP.requirements}
                error={errors.requirements?.message}
                hint="One sentence is enough. Example: “Need 2 electricians for an estate install in Lekki.”"
              >
                <textarea
                  rows={3}
                  className="input-field min-h-[5.5rem] resize-y"
                  placeholder={
                    isTrade
                      ? 'e.g. Need bricklayers for an 8-week site contract in Lagos…'
                      : 'e.g. Need a finance manager with ERP experience…'
                  }
                  {...register('requirements')}
                />
              </FormField>

              <div className="grid gap-4 min-[480px]:grid-cols-2 min-[480px]:gap-5">
                <FormField
                  label="Expected start date"
                  optional
                  help={FIELD_HELP.expectedStartDate}
                  error={errors.expectedStartDate?.message}
                >
                  <DatePickerField
                    value={values.expectedStartDate}
                    onChange={(next) =>
                      setValue('expectedStartDate', next, { shouldValidate: true, shouldDirty: true })
                    }
                    placeholder="Pick a date"
                    minDate={new Date()}
                  />
                </FormField>
                <div className="hidden min-[480px]:block" aria-hidden />
                <FormField
                  label={
                    isTrade
                      ? 'Pay min (NGN — daily / weekly / project)'
                      : 'Compensation min (NGN / month)'
                  }
                  optional
                  help={FIELD_HELP.compensationMinNgn}
                  error={errors.compensationMinNgn?.message}
                >
                  <input
                    type="number"
                    min={0}
                    className="input-field"
                    placeholder={isTrade ? 'e.g. 25000' : 'e.g. 250000'}
                    {...register('compensationMinNgn')}
                  />
                </FormField>
                <FormField
                  label={isTrade ? 'Pay max (NGN — same basis)' : 'Compensation max (NGN / month)'}
                  optional
                  help={FIELD_HELP.compensationMaxNgn}
                  error={errors.compensationMaxNgn?.message}
                >
                  <input
                    type="number"
                    min={0}
                    className="input-field"
                    placeholder={isTrade ? 'e.g. 40000' : 'e.g. 400000'}
                    {...register('compensationMaxNgn')}
                  />
                </FormField>
              </div>

              <FormField
                label="Additional notes"
                optional
                help={FIELD_HELP.additionalNotes}
                error={errors.additionalNotes?.message}
              >
                <textarea
                  rows={3}
                  className="input-field min-h-[4.75rem] resize-y"
                  placeholder="Shifts, PPE, lodging, tools, reporting line — anything useful."
                  {...register('additionalNotes')}
                />
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

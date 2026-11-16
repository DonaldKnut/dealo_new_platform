export type AssistSession = {
  match: {
    id: string;
    title: string;
    company: string;
    url: string;
    coverNote: string | null;
    status: string;
  };
  vault: unknown;
  coverNote: string | null;
  cv: { resumeId: string | null; fileName: string | null; hint: string };
  sitePolicy: { allowed: boolean; reason: string; denyHosts: string[] };
  disclosure: string;
  fillHints: Record<string, string>;
  creditsRemaining: number;
};

export type AssistEditedAnswer = {
  questionKey: string;
  question: string;
  answer: string;
};

export type AssistReport = {
  outcome:
    | 'filled'
    | 'submitted_by_user'
    | 'paused_captcha'
    | 'paused_sso'
    | 'paused_file'
    | 'paused_fee'
    | 'denied_host'
    | 'abandoned'
    | 'error';
  markApplied?: boolean;
  host?: string;
  fieldsTotal: number;
  fieldsFilled: number;
  fieldsAmbiguous: number;
  fieldsSkipped: number;
  pauses: string[];
  notes?: string;
  /** User-edited long-form answers after fill — learned into Apply vault. */
  editedAnswers?: AssistEditedAnswer[];
};

export type StoredAuth = {
  apiBase: string;
  deviceToken: string;
  expiresAt: string;
  matchId?: string;
};

export type FieldDescriptor = {
  id: string;
  name: string;
  label: string;
  autocomplete: string;
  type: string;
  ariaLabel: string;
  placeholder: string;
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
};

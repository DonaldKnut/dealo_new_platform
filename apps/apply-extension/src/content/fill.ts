import { isDangerousField, mapBooleanish, mapFieldLocally } from '../shared/field-map';
import type { AssistReport, AssistSession, FieldDescriptor } from '../shared/types';
import { highlightSubmit, hideOverlay, showOverlay } from './overlay';

const FEE_RE = /application fee|registration fee|processing fee|pay (a|the|an) (fee|deposit)|credit card|card number|cvv|gift card/i;

let ranForMatch: string | null = null;

void boot();

async function boot() {
  const authRes = (await chrome.runtime.sendMessage({ type: 'dealo.getAuth' })) as {
    ok?: boolean;
    auth?: { matchId?: string } | null;
  };
  const matchId = authRes.auth?.matchId;
  if (!matchId || ranForMatch === matchId) return;

  const sessionRes = (await chrome.runtime.sendMessage({ type: 'dealo.getSession', matchId })) as {
    ok?: boolean;
    session?: AssistSession;
    error?: string;
  };
  if (!sessionRes.ok || !sessionRes.session) {
    showOverlay({
      title: 'Dealo Assist',
      body: sessionRes.error ?? 'Could not load your apply session. Reopen Continue apply from the dashboard.',
      tone: 'warn',
      actions: [{ id: 'dismiss', label: 'Dismiss' }],
    }, () => hideOverlay());
    return;
  }

  const session = sessionRes.session;
  try {
    const pageHost = location.hostname.toLowerCase();
    const jobHost = new URL(session.match.url).hostname.toLowerCase();
    // Only auto-run when we land on the match host (or subdomain).
    if (!(pageHost === jobHost || pageHost.endsWith(`.${jobHost}`) || jobHost.endsWith(`.${pageHost}`))) {
      return;
    }
  } catch {
    return;
  }

  ranForMatch = matchId;
  await runAssist(matchId, session);
}

async function runAssist(matchId: string, session: AssistSession) {
  showOverlay({
    title: 'Dealo Assist',
    body: session.disclosure,
    tone: 'info',
    actions: [
      { id: 'fill', label: 'Fill from vault' },
      { id: 'skip', label: 'Not now' },
    ],
  }, async (id) => {
    if (id === 'skip') {
      hideOverlay();
      await sendReport(matchId, baseReport('abandoned', session));
      return;
    }
    await fillPage(matchId, session);
  });
}

async function fillPage(matchId: string, session: AssistSession) {
  if (!session.sitePolicy.allowed) {
    showOverlay({
      title: 'Site not allowed for auto-fill',
      body: session.sitePolicy.reason,
      tone: 'warn',
      actions: [{ id: 'ok', label: 'OK' }],
    }, () => hideOverlay());
    await sendReport(matchId, { ...baseReport('denied_host', session), pauses: ['denied_host'] });
    return;
  }

  const pauses: string[] = [];
  if (detectCaptcha()) {
    pauses.push('captcha');
    await sendReport(matchId, { ...baseReport('paused_captcha', session), pauses });
    await pauseWithRetry(
      matchId,
      session,
      {
        title: 'CAPTCHA detected',
        body: 'Solve the CAPTCHA yourself — Assist will not bypass it. When the challenge is gone, tap Fill again.',
        tone: 'warn',
      },
      pauses,
    );
    return;
  }

  if (detectSsoWall()) {
    pauses.push('sso');
    await sendReport(matchId, { ...baseReport('paused_sso', session), pauses });
    await pauseWithRetry(
      matchId,
      session,
      {
        title: 'Sign-in required',
        body: 'Log in with your own browser account. Dealo never stores third-party passwords. After you are in, tap Fill again — we will fill the application form, not the login.',
        tone: 'warn',
      },
      pauses,
    );
    return;
  }

  if (detectFeeFields()) {
    pauses.push('fee');
    await sendReport(matchId, { ...baseReport('paused_fee', session), pauses });
    showOverlay(
      {
        title: 'Fee / payment field detected',
        body: 'Legitimate employers do not charge application fees. Skip this listing if money is requested. Assist will not fill payment fields.',
        tone: 'warn',
        actions: [
          { id: 'skip', label: 'Skip listing' },
          { id: 'retry', label: 'Fill safe fields anyway' },
        ],
      },
      async (id) => {
        if (id === 'retry') {
          // Continue into fill loop; dangerous fee fields stay skipped via isDangerousField.
          return fillPageContinue(matchId, session, pauses);
        }
        hideOverlay();
      },
    );
    return;
  }

  await fillPageContinue(matchId, session, pauses);
}

/** Shared fill body after gate checks (or after user chooses to continue past a soft pause). */
async function fillPageContinue(matchId: string, session: AssistSession, pauses: string[]) {

  const fields = collectFields();
  const hints = session.fillHints;
  let filled = 0;
  let skipped = 0;
  let ambiguous: FieldDescriptor[] = [];
  /** Original filled values so we can detect user edits for vault learning. */
  const filledSnapshot = new Map<string, { label: string; vaultKey: string; value: string; el: FieldDescriptor['el'] }>();

  for (const field of fields) {
    if (isDangerousField(field)) {
      skipped += 1;
      continue;
    }
    if (field.type === 'checkbox' || field.type === 'radio') {
      const boolish = mapBooleanish(field, hints);
      if (boolish && boolish.confidence >= 0.7 && field.el instanceof HTMLInputElement) {
        const wantOn = boolish.value === 'true';
        if (field.el.checked !== wantOn) {
          field.el.checked = wantOn;
          field.el.dispatchEvent(new Event('input', { bubbles: true }));
          field.el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        filled += 1;
        filledSnapshot.set(field.id, {
          label: field.label || field.name || field.id,
          vaultKey: boolish.vaultKey,
          value: boolish.value,
          el: field.el,
        });
        continue;
      }
      skipped += 1;
      continue;
    }
    const local = mapFieldLocally(field, hints);
    if (local && local.confidence >= 0.7) {
      setValue(field.el, local.value);
      filled += 1;
      filledSnapshot.set(field.id, { label: field.label || field.name || field.id, vaultKey: local.vaultKey, value: local.value, el: field.el });
    } else {
      ambiguous.push(field);
    }
  }

  if (ambiguous.length) {
    try {
      const mapped = (await chrome.runtime.sendMessage({
        type: 'dealo.mapFields',
        matchId,
        fields: ambiguous.map(({ el: _el, ...rest }) => rest),
      })) as { ok?: boolean; mappings?: { fieldId: string; vaultKey: string; value: string; confidence: number }[] };
      const byId = new Map((mapped.mappings ?? []).map((m) => [m.fieldId, m]));
      const still: FieldDescriptor[] = [];
      for (const field of ambiguous) {
        const hit = byId.get(field.id);
        if (hit?.value && hit.confidence >= 0.55) {
          setValue(field.el, hit.value);
          filled += 1;
          filledSnapshot.set(field.id, {
            label: field.label || field.name || field.id,
            vaultKey: hit.vaultKey,
            value: hit.value,
            el: field.el,
          });
        } else {
          still.push(field);
          skipped += 1;
        }
      }
      ambiguous = still;
    } catch {
      skipped += ambiguous.length;
    }
  }

  const fileInputs = [...document.querySelectorAll<HTMLInputElement>('input[type="file"]')].filter(
    (el) => el.offsetParent !== null || el.getClientRects().length > 0,
  );
  if (fileInputs.length) {
    pauses.push('file');
    await sendReport(matchId, {
      ...baseReport('paused_file', session),
      fieldsTotal: fields.length,
      fieldsFilled: filled,
      fieldsAmbiguous: ambiguous.length,
      fieldsSkipped: skipped,
      pauses,
    });
  }

  const submits = findSubmitControls();
  highlightSubmit(submits);
  const statsBase = {
    fieldsTotal: fields.length + fileInputs.length,
    fieldsFilled: filled,
    fieldsAmbiguous: ambiguous.length,
    fieldsSkipped: skipped + fileInputs.length,
    pauses,
  };
  watchUserSubmit(matchId, session, statsBase, filledSnapshot);

  const coverage = statsBase.fieldsTotal ? Math.round((filled / statsBase.fieldsTotal) * 100) : 0;
  const nextStep = findNextStepControl();
  const actions: { id: string; label: string }[] = [
    { id: 'retry', label: 'Fill again' },
    { id: 'mark', label: 'I submitted' },
    { id: 'dismiss', label: 'Dismiss' },
  ];
  if (nextStep) actions.unshift({ id: 'next', label: 'Fill next step' });

  const fileHint = fileInputs.length
    ? ` Attach your CV yourself${session.cv.fileName ? ` (${session.cv.fileName})` : ''} — Assist never picks files.`
    : '';
  const coverageHint =
    coverage >= 70
      ? ' High coverage — worth finishing now; Assist credits are for this guided finish.'
      : coverage >= 40
        ? ' Partial fill — review blanks, then Submit yourself.'
        : ' Low coverage — use prep answers in the vault and Fill again after you advance the form.';

  showOverlay({
    title: fileInputs.length ? 'Almost there — attach CV, then submit' : 'Fields filled — you submit',
    body: `Filled ${filled}/${statsBase.fieldsTotal} fields (~${coverage}% coverage).${fileHint}${coverageHint}${
      nextStep ? ' Multi-step form detected — use Fill next step, then review and Submit yourself.' : ''
    } Assist never auto-submits.`,
    tone: coverage >= 70 ? 'ok' : 'info',
    actions,
  }, async (id) => {
    const editedAnswers = collectEditedAnswers(filledSnapshot);
    if (id === 'retry') {
      await sendReport(matchId, { ...baseReport('filled', session), ...statsBase, editedAnswers, notes: 'User requested Fill again' });
      ranForMatch = null;
      await fillPage(matchId, session);
      return;
    }
    if (id === 'next' && nextStep) {
      await sendReport(matchId, { ...baseReport('filled', session), ...statsBase, editedAnswers, notes: 'Advancing multi-step form' });
      nextStep.click();
      await waitForDomSettle(900);
      ranForMatch = null;
      await fillPage(matchId, session);
      return;
    }
    if (id === 'mark') {
      await sendReport(matchId, {
        ...baseReport('submitted_by_user', session),
        markApplied: true,
        ...statsBase,
        editedAnswers,
      });
      showOverlay({ title: 'Marked applied', body: 'Credits updated on Dealo. You can close this tab.', tone: 'ok' });
    } else {
      hideOverlay();
      await sendReport(matchId, {
        ...baseReport('filled', session),
        ...statsBase,
        editedAnswers,
      });
    }
  });
}

async function pauseWithRetry(
  matchId: string,
  session: AssistSession,
  state: { title: string; body: string; tone: 'warn' | 'info' | 'ok' },
  _pauses: string[],
) {
  showOverlay(
    {
      ...state,
      actions: [
        { id: 'retry', label: 'Fill again' },
        { id: 'dismiss', label: 'Got it' },
      ],
    },
    async (id) => {
      if (id === 'retry') {
        ranForMatch = null;
        await waitForDomSettle(400);
        await fillPage(matchId, session);
        return;
      }
      hideOverlay();
    },
  );
}

const FIELD_SEL =
  'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=image]):not([type=file]), textarea, select';

/** Collect fields from the page, open shadow roots, and same-origin iframes (cross-origin frames are skipped). */
function collectFields(): FieldDescriptor[] {
  const nodes: Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> = [];
  const visit = (root: Document | ShadowRoot | Element) => {
    if ('querySelectorAll' in root) {
      nodes.push(...root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(FIELD_SEL));
    }
    const host = root instanceof Element ? root : root instanceof Document ? root.documentElement : null;
    const scope = host ?? (root as Document | ShadowRoot);
    for (const el of scope.querySelectorAll?.('*') ?? []) {
      if (el instanceof HTMLElement && el.shadowRoot) visit(el.shadowRoot);
    }
  };
  visit(document);
  for (const frame of document.querySelectorAll('iframe')) {
    try {
      const doc = frame.contentDocument;
      if (doc) visit(doc);
    } catch {
      // Cross-origin iframe — Assist cannot read it; user finishes those fields.
    }
  }
  return nodes
    .filter((el) => el.offsetParent !== null || el.getClientRects().length > 0)
    .map((el, index) => {
      const id = el.id || el.getAttribute('name') || `dealo_f_${index}`;
      return {
        id,
        name: el.getAttribute('name') ?? '',
        label: labelFor(el),
        autocomplete: el.getAttribute('autocomplete') ?? '',
        type: (el instanceof HTMLInputElement ? el.type : el.tagName.toLowerCase()) || 'text',
        ariaLabel: el.getAttribute('aria-label') ?? '',
        placeholder: el.getAttribute('placeholder') ?? '',
        el,
      };
    });
}

function labelFor(el: Element) {
  const id = el.getAttribute('id');
  if (id) {
    const lab = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (lab?.textContent) return lab.textContent.trim().slice(0, 240);
  }
  const wrapping = el.closest('label');
  if (wrapping?.textContent) return wrapping.textContent.trim().slice(0, 240);
  const labelled = el.getAttribute('aria-labelledby');
  if (labelled) {
    const text = labelled
      .split(/\s+/)
      .map((idPart) => document.getElementById(idPart)?.textContent?.trim() ?? '')
      .join(' ');
    if (text) return text.slice(0, 240);
  }
  // Workday / Teamtailor often expose machine ids instead of classic labels.
  const automation =
    el.getAttribute('data-automation-id') ||
    el.getAttribute('data-testid') ||
    el.getAttribute('data-qa') ||
    el.getAttribute('name') ||
    id;
  if (automation) {
    return automation
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[-_./]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 240);
  }
  return '';
}

function setValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  if (el instanceof HTMLSelectElement) {
    const opt = [...el.options].find((o) => o.value === value || o.text.trim().toLowerCase() === value.toLowerCase());
    if (opt) el.value = opt.value;
    else return;
  } else {
    el.focus();
    el.value = value;
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function controlText(btn: HTMLElement) {
  return `${btn.textContent ?? ''} ${btn.getAttribute('value') ?? ''} ${btn.getAttribute('aria-label') ?? ''}`.toLowerCase();
}

function findSubmitControls() {
  const buttons = [...document.querySelectorAll<HTMLElement>('button[type="submit"], input[type="submit"], button, a[role="button"]')];
  return buttons.filter((btn) => /submit|apply|send application|continue|next|finish|save and continue/.test(controlText(btn)));
}

/** Next/Continue that advances a multi-step form without final submit. */
function findNextStepControl(): HTMLElement | null {
  const buttons = [...document.querySelectorAll<HTMLElement>('button, input[type="button"], input[type="submit"], a[role="button"]')];
  const next = buttons.find((btn) => {
    const text = controlText(btn);
    if (/submit|apply|send application|finish|done/.test(text) && !/continue|next|save and continue/.test(text)) return false;
    return /^(next|continue|save and continue)$|next step|continue to|save and continue/.test(text) || /\bnext\b|\bcontinue\b/.test(text);
  });
  return next && (next.offsetParent !== null || next.getClientRects().length > 0) ? next : null;
}

function waitForDomSettle(ms = 700) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function detectCaptcha() {
  // Prefer real widgets — body text alone caused false pauses on career pages that mention “CAPTCHA” in footers.
  if (
    document.querySelector(
      'iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .g-recaptcha, .h-captcha, [data-sitekey], #cf-turnstile, [class*="cf-turnstile"]',
    )
  ) {
    return true;
  }
  const widget = document.querySelector('[class*="captcha" i], [id*="captcha" i]');
  if (widget && (widget as HTMLElement).offsetParent !== null) return true;
  return false;
}

/**
 * Hard pause only for login walls. If the page already looks like an application form
 * (several safe fields), skip the password via isDangerousField and fill the rest.
 */
function detectSsoWall() {
  const pwd = [...document.querySelectorAll<HTMLInputElement>('input[type="password"]')].find(
    (el) => el.offsetParent !== null || el.getClientRects().length > 0,
  );
  if (!pwd) return false;

  const safeFields = collectFields().filter((f) => !isDangerousField(f) && f.type !== 'password');
  if (safeFields.length >= 4) return false;

  const form = pwd.closest('form');
  const scope = (form?.innerText ?? document.body?.innerText ?? '').slice(0, 2500);
  const hasEmail =
    Boolean(form?.querySelector('input[type="email"], input[name*="email" i], input[autocomplete="username"]')) ||
    /email|username|work account/i.test(scope);
  const loginCopy = /sign in|log in|login|sso|continue with google|continue with microsoft|continue with linkedin|single sign-?on|enter your password/i.test(
    scope,
  );
  const workdayLogin =
    /myworkdayjobs|workday/i.test(location.hostname) &&
    /sign in|create account|forgot password|email address/i.test(scope) &&
    safeFields.length <= 3;
  return (hasEmail && loginCopy) || workdayLogin;
}

function detectFeeFields() {
  const blob = [...document.querySelectorAll('label, legend, input, textarea')]
    .map((n) => `${n.textContent ?? ''} ${n.getAttribute('name') ?? ''} ${n.getAttribute('placeholder') ?? ''}`)
    .join(' ')
    .slice(0, 12_000);
  return FEE_RE.test(blob);
}

function watchUserSubmit(
  matchId: string,
  session: AssistSession,
  stats: Pick<AssistReport, 'fieldsTotal' | 'fieldsFilled' | 'fieldsAmbiguous' | 'fieldsSkipped' | 'pauses'>,
  filledSnapshot: Map<string, { label: string; vaultKey: string; value: string; el: FieldDescriptor['el'] }>,
) {
  const handler = (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const btn = target.closest('button, input[type="submit"], a[role="button"]') as HTMLElement | null;
    if (!btn || btn.dataset.dealoSubmitHighlight !== '1') return;
    void sendReport(matchId, {
      ...baseReport('submitted_by_user', session),
      markApplied: true,
      ...stats,
      editedAnswers: collectEditedAnswers(filledSnapshot),
    });
    showOverlay({
      title: 'Submit detected',
      body: 'Marked as applied on Dealo (assist credit). Double-check the employer confirmation page.',
      tone: 'ok',
    });
    document.removeEventListener('click', handler, true);
  };
  document.addEventListener('click', handler, true);
}

/** Capture long-form / Q&A-like fields the user changed after Assist filled them. */
function collectEditedAnswers(
  filledSnapshot: Map<string, { label: string; vaultKey: string; value: string; el: FieldDescriptor['el'] }>,
): AssistReport['editedAnswers'] {
  const out: NonNullable<AssistReport['editedAnswers']> = [];
  for (const snap of filledSnapshot.values()) {
    const current = 'value' in snap.el ? String(snap.el.value ?? '').trim() : '';
    if (!current || current === snap.value.trim()) continue;
    // Learn free-text / cover / custom Q&A edits; skip tiny identity fields.
    if (current.length < 12 && !/cover|why|experience|salary|notice|authorize|sponsor/i.test(snap.label + snap.vaultKey)) {
      continue;
    }
    const key = snap.vaultKey.replace(/^(qa_|draft_)/, '').slice(0, 80) || 'custom_answer';
    out.push({
      questionKey: key,
      question: snap.label.slice(0, 400) || key.replace(/_/g, ' '),
      answer: current.slice(0, 4000),
    });
    if (out.length >= 40) break;
  }
  return out.length ? out : undefined;
}

function baseReport(outcome: AssistReport['outcome'], session: AssistSession): AssistReport {
  return {
    outcome,
    host: location.hostname,
    fieldsTotal: 0,
    fieldsFilled: 0,
    fieldsAmbiguous: 0,
    fieldsSkipped: 0,
    pauses: [],
    notes: `${session.match.title} @ ${session.match.company}`,
  };
}

async function sendReport(matchId: string, report: AssistReport) {
  await chrome.runtime.sendMessage({ type: 'dealo.report', matchId, report });
}

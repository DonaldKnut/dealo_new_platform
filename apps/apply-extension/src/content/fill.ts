import { isDangerousField, mapBooleanish, mapFieldLocally } from '../shared/field-map';
import type { AssistReport, AssistSession, FieldDescriptor } from '../shared/types';
import { highlightSubmit, hideOverlay, showOverlay } from './overlay';

const FEE_RE = /application fee|registration fee|processing fee|pay (a|the|an) (fee|deposit)|credit card|card number|cvv|gift card/i;
const CAPTCHA_RE = /captcha|recaptcha|hcaptcha|cf-turnstile|challenge-platform/i;

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
    showOverlay({
      title: 'CAPTCHA detected',
      body: 'Solve the CAPTCHA yourself. Assist will not bypass it. Then click Fill again if needed.',
      tone: 'warn',
      actions: [{ id: 'ok', label: 'Got it' }],
    }, () => hideOverlay());
    await sendReport(matchId, { ...baseReport('paused_captcha', session), pauses });
    return;
  }

  if (detectSso()) {
    pauses.push('sso');
    showOverlay({
      title: 'Sign-in required',
      body: 'Log in with your own browser account. Dealo never stores third-party passwords.',
      tone: 'warn',
      actions: [{ id: 'ok', label: 'Got it' }],
    }, () => hideOverlay());
    await sendReport(matchId, { ...baseReport('paused_sso', session), pauses });
    return;
  }

  if (detectFeeFields()) {
    pauses.push('fee');
    showOverlay({
      title: 'Fee / payment field detected',
      body: 'Legitimate employers do not charge application fees. Stop and skip this listing if money is requested.',
      tone: 'warn',
      actions: [{ id: 'ok', label: 'Understood' }],
    }, () => hideOverlay());
    await sendReport(matchId, { ...baseReport('paused_fee', session), pauses });
    return;
  }

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
    showOverlay({
      title: 'Upload your CV',
      body: `${session.cv.hint}${session.cv.fileName ? ` Suggested file: ${session.cv.fileName}.` : ''} Assist will not pick files for you. After you attach the file, click Fill again or Submit yourself.`,
      tone: 'info',
      actions: [{ id: 'ok', label: 'Got it' }],
    }, () => hideOverlay());
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
  showOverlay({
    title: 'Fields filled — you submit',
    body: `Filled ${filled}/${statsBase.fieldsTotal} fields (~${coverage}% coverage). Review answers, attach your CV if asked, then click the highlighted Submit yourself. Assist never auto-submits.`,
    tone: 'ok',
    actions: [
      { id: 'mark', label: 'I submitted' },
      { id: 'dismiss', label: 'Dismiss' },
    ],
  }, async (id) => {
    const editedAnswers = collectEditedAnswers(filledSnapshot);
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

function collectFields(): FieldDescriptor[] {
  const nodes = [
    ...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=image]):not([type=file]), textarea, select',
    ),
  ];
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

function findSubmitControls() {
  const buttons = [
    ...document.querySelectorAll<HTMLElement>(
      'button[type="submit"], input[type="submit"], button, a[role="button"]',
    ),
  ];
  return buttons.filter((btn) => {
    const text = `${btn.textContent ?? ''} ${btn.getAttribute('value') ?? ''} ${btn.getAttribute('aria-label') ?? ''}`.toLowerCase();
    return /submit|apply|send application|continue|next|finish|save and continue/.test(text);
  });
}

function detectCaptcha() {
  if (document.querySelector('iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .g-recaptcha, .h-captcha')) {
    return true;
  }
  return CAPTCHA_RE.test(document.body?.innerText?.slice(0, 8000) ?? '');
}

function detectSso() {
  // Only pause when a visible password field sits in a clear login / SSO wall — not every form that mentions “login”.
  const pwd = [...document.querySelectorAll<HTMLInputElement>('input[type="password"]')].find(
    (el) => el.offsetParent !== null || el.getClientRects().length > 0,
  );
  if (!pwd) return false;
  const form = pwd.closest('form');
  const scope = (form?.innerText ?? document.body?.innerText ?? '').slice(0, 2500);
  const hasEmail =
    Boolean(form?.querySelector('input[type="email"], input[name*="email" i], input[autocomplete="username"]')) ||
    /email|username|work account/i.test(scope);
  return hasEmail && /sign in|log in|login|sso|continue with google|continue with linkedin|single sign-?on/i.test(scope);
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

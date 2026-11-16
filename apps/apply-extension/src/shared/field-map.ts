import type { FieldDescriptor } from './types';

const RULES: { re: RegExp; key: string }[] = [
  { re: /email|e-mail/i, key: 'email' },
  { re: /phone|mobile|tel|cell.?phone|phone.?number/i, key: 'phone' },
  { re: /first.?name|given.?name|legal.?first/i, key: 'first_name' },
  { re: /last.?name|family.?name|surname|legal.?last/i, key: 'last_name' },
  // Workday / Teamtailor often use legalName / preferredName / candidateName.
  { re: /legal.?name|preferred.?name|candidate.?name|full.?name|(^|[\s_-])name([\s_-]|$)/i, key: 'full_name' },
  { re: /linkedin/i, key: 'linkedin' },
  { re: /github/i, key: 'github' },
  { re: /portfolio|personal.?site|website|homepage|personal.?url/i, key: 'website' },
  { re: /cover|letter|message|motivation|why.?us|additional.?info|supporting.?statement/i, key: 'cover_letter' },
  { re: /city|location|address|town|country.?of.?residence|where.?do.?you.?live/i, key: 'location' },
  { re: /salary|compensation|expect|desired.?pay|pay.?expectation/i, key: 'salary_min' },
  { re: /sponsor|visa|work.?auth|authorized.?to.?work|right.?to.?work|legally.?authorized/i, key: 'needs_sponsorship' },
  { re: /school|university|college|institution/i, key: 'school' },
  { re: /degree|qualification|education.?level/i, key: 'degree' },
  { re: /company|employer|current.?employer|present.?employer|organization.?name/i, key: 'current_company' },
  { re: /(?:job.?title|current.?title|current.?role|position.?title|role.?title)|^title$|role|position/i, key: 'current_title' },
  { re: /notice.?period|earliest.?start|available.?from|start.?date|availability.?date/i, key: 'availability' },
  { re: /years?.?of.?experience|total.?experience|experience.?years/i, key: 'years_experience' },
  { re: /how.?did.?you.?hear|referral.?source|source.?of.?application/i, key: 'source' },
];

const DANGER =
  /password|passwd|credit.?card|card.?number|cvv|cvc|ssn|social.?security|routing|iban|bank.?account|fee|payment|deposit|gift.?card/i;

export function fieldBlob(f: Omit<FieldDescriptor, 'el'>) {
  return `${f.name} ${f.label} ${f.autocomplete} ${f.ariaLabel} ${f.placeholder} ${f.type}`;
}

export function isDangerousField(f: Omit<FieldDescriptor, 'el'>) {
  if (f.type === 'password' || f.type === 'hidden') return true;
  return DANGER.test(fieldBlob(f));
}

function slugLabel(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60);
}

function tokenSet(value: string) {
  return new Set(value.split('_').filter((t) => t.length >= 3));
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  return inter / (a.size + b.size - inter);
}

/** Match qa_* / draft_* hints by questionKey ↔ field label similarity (exact, contains, token overlap). */
function mapQaHint(
  field: Omit<FieldDescriptor, 'el'>,
  hints: Record<string, string>,
): { vaultKey: string; value: string; confidence: number } | null {
  const labelRaw = `${field.label} ${field.name} ${field.ariaLabel} ${field.placeholder}`.trim();
  const labelKey = slugLabel(labelRaw);
  if (!labelKey || labelKey.length < 3) return null;
  const labelTokens = tokenSet(labelKey);
  const entries = Object.entries(hints).filter(([key]) => key.startsWith('qa_') || key.startsWith('draft_'));
  let best: { key: string; value: string; score: number } | null = null;
  for (const [key, value] of entries) {
    if (!value.trim()) continue;
    const bare = key.replace(/^(qa_|draft_)/, '');
    let score = 0;
    if (bare === labelKey) score = 1;
    else if (bare.includes(labelKey) || labelKey.includes(bare)) score = 0.85;
    else score = jaccard(labelTokens, tokenSet(bare));
    // Also compare against human-readable question text encoded in the key.
    if (score < 0.5) {
      const soft = jaccard(labelTokens, tokenSet(slugLabel(bare.replace(/_/g, ' '))));
      score = Math.max(score, soft);
    }
    if (!best || score > best.score) best = { key, value, score };
  }
  // Slightly softer threshold so career-page label variants (and vault edits) still match.
  if (!best || best.score < 0.38) return null;
  return { vaultKey: best.key, value: best.value, confidence: Math.min(0.9, 0.52 + best.score * 0.35) };
}

export function mapFieldLocally(
  field: Omit<FieldDescriptor, 'el'>,
  hints: Record<string, string>,
): { vaultKey: string; value: string; confidence: number } | null {
  if (isDangerousField(field)) return null;
  const blob = fieldBlob(field);
  const auto = field.autocomplete.toLowerCase();
  const autoMap: Record<string, string> = {
    email: 'email',
    'email-address': 'email',
    tel: 'phone',
    'tel-national': 'phone',
    'given-name': 'first_name',
    'family-name': 'last_name',
    name: 'full_name',
    'organization-title': 'current_title',
    organization: 'current_company',
    'street-address': 'location',
    'address-level2': 'city',
    url: 'website',
  };
  if (auto && autoMap[auto] && hints[autoMap[auto]]) {
    return { vaultKey: autoMap[auto], value: hints[autoMap[auto]], confidence: 0.95 };
  }
  const hit = RULES.find((r) => r.re.test(blob));
  if (hit && hints[hit.key]) {
    return { vaultKey: hit.key, value: hints[hit.key], confidence: 0.85 };
  }
  return mapQaHint(field, hints);
}

/** Yes/no style values for checkbox / radio fields. */
export function mapBooleanish(
  field: Omit<FieldDescriptor, 'el'>,
  hints: Record<string, string>,
): { vaultKey: string; value: string; confidence: number } | null {
  if (field.type !== 'checkbox' && field.type !== 'radio') return null;
  if (isDangerousField(field)) return null;
  const local = mapFieldLocally({ ...field, type: 'text' }, hints);
  if (!local) return null;
  const truthy = /^(yes|true|1|y)$/i.test(local.value.trim());
  const falsy = /^(no|false|0|n)$/i.test(local.value.trim());
  if (!truthy && !falsy) return null;
  return { vaultKey: local.vaultKey, value: truthy ? 'true' : 'false', confidence: Math.min(0.8, local.confidence) };
}

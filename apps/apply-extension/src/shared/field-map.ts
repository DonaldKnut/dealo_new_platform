import type { FieldDescriptor } from './types';

const RULES: { re: RegExp; key: string }[] = [
  { re: /email|e-mail/i, key: 'email' },
  { re: /phone|mobile|tel/i, key: 'phone' },
  { re: /first.?name|given.?name/i, key: 'first_name' },
  { re: /last.?name|family.?name|surname/i, key: 'last_name' },
  { re: /full.?name|(^|[\s_-])name([\s_-]|$)/i, key: 'full_name' },
  { re: /linkedin/i, key: 'linkedin' },
  { re: /github/i, key: 'github' },
  { re: /portfolio|personal.?site|website|homepage/i, key: 'website' },
  { re: /cover|letter|message|motivation|why.?us|additional.?info/i, key: 'cover_letter' },
  { re: /city|location|address|town/i, key: 'location' },
  { re: /salary|compensation|expect/i, key: 'salary_min' },
  { re: /sponsor|visa|work.?auth|authorized/i, key: 'needs_sponsorship' },
  { re: /school|university|college/i, key: 'school' },
  { re: /degree|qualification/i, key: 'degree' },
  { re: /company|employer/i, key: 'current_company' },
  { re: /title|role|position|job.?title/i, key: 'current_title' },
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

/** Match qa_* / draft_* hints by questionKey ↔ field label similarity. */
function mapQaHint(
  field: Omit<FieldDescriptor, 'el'>,
  hints: Record<string, string>,
): { vaultKey: string; value: string; confidence: number } | null {
  const labelKey = slugLabel(field.label || field.name || field.ariaLabel || field.placeholder);
  if (!labelKey || labelKey.length < 4) return null;
  const entries = Object.entries(hints).filter(([key]) => key.startsWith('qa_') || key.startsWith('draft_'));
  const hit = entries.find(([key]) => {
    const bare = key.replace(/^(qa_|draft_)/, '');
    return bare === labelKey || bare.includes(labelKey) || labelKey.includes(bare);
  });
  if (!hit) return null;
  return { vaultKey: hit[0], value: hit[1], confidence: 0.72 };
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

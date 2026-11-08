/**
 * Turns editor HTML into an email that looks right in Gmail, Outlook and phone mail apps:
 * styles are written inline (mail apps ignore stylesheets) inside a centred 600px card.
 * Used by the API when sending and by the dashboard preview, so both look the same.
 */

const BRAND = '#0f766e';
const TEXT = '#1f2d2b';
const HEADING = '#0b1f1e';
const LOGO = 'https://res.cloudinary.com/dyaetoldv/image/upload/v1793397172/Dealo_Talent_Network_Logo_psqwch.png';

const STYLE: Record<string, string> = {
  p: `margin:0 0 16px;font-size:16px;line-height:1.65;color:${TEXT}`,
  h2: `margin:28px 0 12px;font-size:22px;line-height:1.3;font-weight:700;color:${HEADING}`,
  h3: `margin:24px 0 10px;font-size:18px;line-height:1.35;font-weight:700;color:${HEADING}`,
  h4: `margin:20px 0 8px;font-size:16px;line-height:1.4;font-weight:700;color:${HEADING}`,
  ul: `margin:0 0 16px;padding-left:22px;color:${TEXT}`,
  ol: `margin:0 0 16px;padding-left:22px;color:${TEXT}`,
  li: `margin:0 0 6px;font-size:16px;line-height:1.6`,
  blockquote: `margin:0 0 16px;padding:12px 16px;border-left:3px solid #14b8a6;background:#ecfdf8;border-radius:0 12px 12px 0;color:${HEADING};font-size:16px;line-height:1.6`,
  hr: 'border:0;border-top:1px solid #e2e8f0;margin:24px 0',
  code: 'background:#f1f5f9;padding:1px 5px;border-radius:4px;font-family:Consolas,Menlo,monospace;font-size:14px',
  pre: 'margin:0 0 16px;padding:12px;background:#f1f5f9;border-radius:8px;font-family:Consolas,Menlo,monospace;font-size:13px;white-space:pre-wrap',
  strong: `font-weight:700;color:${HEADING}`,
};

const LINK_STYLE = `color:${BRAND};text-decoration:underline;font-weight:600`;
const BUTTON_STYLE = `display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 24px;border-radius:999px`;
const IMG_STYLE = 'display:block;width:100%;max-width:100%;height:auto;border:0;border-radius:12px;margin:4px 0 16px';

const escapeAttr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'))?.slice(2, 4).find((v) => v !== undefined) ?? null;

/** Plain text (no tags) becomes paragraphs; blank lines split them. */
function toHtml(body: string) {
  if (/<[a-z][\s\S]*>/i.test(body)) return body;
  return body
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function inlineEmailStyles(body: string) {
  return toHtml(body)
    .replace(/<(p|h2|h3|h4|ul|ol|li|blockquote|hr|code|pre|strong)(\s[^>]*)?>/gi, (_m, tag: string) => `<${tag.toLowerCase()} style="${STYLE[tag.toLowerCase()]}">`)
    .replace(/<img\b[^>]*>/gi, (tag) => {
      const src = attr(tag, 'src');
      if (!src) return '';
      const alt = attr(tag, 'alt') ?? '';
      return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" width="552" style="${IMG_STYLE}">`;
    })
    .replace(/<a\b[^>]*>/gi, (tag) => {
      const href = attr(tag, 'href') ?? '#';
      const button = attr(tag, 'data-kind') === 'button';
      return `<a href="${escapeAttr(href)}" target="_blank" style="${button ? BUTTON_STYLE : LINK_STYLE}">`;
    });
}

export function renderEmailHtml(body: string, opts: { siteUrl?: string; preheader?: string; footerNote?: string } = {}) {
  if (/<html[\s>]/i.test(body)) return body;
  const site = (opts.siteUrl ?? 'https://dealo.ng').replace(/\/$/, '');
  const preheader = opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeAttr(opts.preheader)}</div>` : '';
  const footer = opts.footerNote ?? 'You are getting this email because you have a Dealo account or asked for Dealo updates.';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#f2f6f5">${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f6f5;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px">
<tr><td style="padding:4px 8px 16px"><a href="${site}" target="_blank"><img src="${LOGO}" alt="Dealo" width="132" style="display:block;width:132px;height:auto;border:0"></a></td></tr>
<tr><td style="background:#ffffff;border-radius:20px;padding:32px 24px;font-family:Arial,Helvetica,sans-serif;border:1px solid #e3ecea">${inlineEmailStyles(body)}</td></tr>
<tr><td style="padding:16px 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6b7c7a;text-align:center">${escapeAttr(footer)}<br><a href="${site}" target="_blank" style="color:${BRAND}">${site.replace(/^https?:\/\//, '')}</a></td></tr>
</table></td></tr></table></body></html>`;
}

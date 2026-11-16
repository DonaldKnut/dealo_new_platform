const ROOT_ID = 'dealo-apply-copilot-root';

export type OverlayState = {
  title: string;
  body: string;
  tone?: 'info' | 'warn' | 'ok';
  actions?: { label: string; id: string }[];
};

export function ensureOverlay(): HTMLElement {
  let root = document.getElementById(ROOT_ID);
  if (root) return root;
  root = document.createElement('div');
  root.id = ROOT_ID;
  root.style.cssText =
    'all:initial;position:fixed;z-index:2147483646;inset:auto 16px 16px auto;font-family:Segoe UI,system-ui,sans-serif;';
  document.documentElement.appendChild(root);
  return root;
}

export function showOverlay(state: OverlayState, onAction?: (id: string) => void) {
  const root = ensureOverlay();
  const tone =
    state.tone === 'warn' ? '#f59e0b' : state.tone === 'ok' ? '#10b981' : '#7cff4d';
  root.innerHTML = `
    <div style="width:min(360px,calc(100vw - 32px));border-radius:16px;background:#062417;color:#f4fff0;box-shadow:0 18px 50px rgba(0,0,0,.35);padding:14px 16px;border:1px solid rgba(124,255,77,.35);">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="width:8px;height:8px;border-radius:999px;background:${tone};box-shadow:0 0 12px ${tone};"></span>
        <strong style="font-size:13px;letter-spacing:.01em;">${escapeHtml(state.title)}</strong>
      </div>
      <p style="margin:0;font-size:12.5px;line-height:1.45;color:rgba(244,255,240,.88);">${escapeHtml(state.body)}</p>
      <div data-actions style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;"></div>
    </div>
  `;
  const actions = root.querySelector('[data-actions]');
  for (const action of state.actions ?? []) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = action.label;
    btn.style.cssText =
      'cursor:pointer;border:0;border-radius:999px;padding:7px 12px;font-size:12px;font-weight:600;background:#7cff4d;color:#062417;';
    btn.addEventListener('click', () => onAction?.(action.id));
    actions?.appendChild(btn);
  }
}

export function hideOverlay() {
  document.getElementById(ROOT_ID)?.remove();
}

export function highlightSubmit(buttons: HTMLElement[]) {
  for (const btn of buttons) {
    btn.style.outline = '3px solid #7cff4d';
    btn.style.outlineOffset = '3px';
    btn.dataset.dealoSubmitHighlight = '1';
    if (!btn.title) btn.title = 'Dealo: click Submit yourself — Assist never auto-submits';
  }
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

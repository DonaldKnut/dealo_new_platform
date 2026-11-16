import { clearAuth, getAuth } from '../shared/api';

const statusEl = document.getElementById('status')!;
const detailEl = document.getElementById('detail')!;
const openBtn = document.getElementById('open-dashboard') as HTMLButtonElement;
const disconnectBtn = document.getElementById('disconnect') as HTMLButtonElement;

void refresh();

openBtn.addEventListener('click', () => {
  void chrome.tabs.create({ url: 'http://localhost:3000/dashboard/job-agent' });
});

disconnectBtn.addEventListener('click', () => {
  void clearAuth().then(refresh);
});

async function refresh() {
  const auth = await getAuth();
  if (!auth) {
    statusEl.textContent = 'Not connected';
    detailEl.textContent = 'Use Continue apply on the Dealo dashboard to hand a short-lived device token to this extension.';
    disconnectBtn.disabled = true;
    return;
  }
  statusEl.textContent = 'Connected';
  detailEl.textContent = auth.matchId
    ? `Active assist match ${auth.matchId.slice(0, 8)}… · expires ${new Date(auth.expiresAt).toLocaleTimeString()}`
    : `Token expires ${new Date(auth.expiresAt).toLocaleTimeString()}`;
  disconnectBtn.disabled = false;
}

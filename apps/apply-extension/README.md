# Dealo Apply Copilot (MV3)

Supervised browser assist for `site_assisted` Job Agent matches.

- Pulls vault + drafts via a short-lived `dja_…` device token
- Maps form fields with local rules (+ optional LLM for ambiguous fields)
- **Never auto-submits** — highlights Submit; your click is required
- Pauses on CAPTCHA, SSO/password walls, file pickers, and fee/payment fields
- Reports field coverage back to `POST /job-agent/matches/:id/assist-report`

## Load unpacked / sideload zip

```bash
pnpm --filter @dealo/apply-extension install
pnpm --filter @dealo/apply-extension build
# zip for dashboard download + sharing (Chrome still wants an unzipped folder for Load unpacked)
pnpm --filter @dealo/apply-extension package
```

Signed download: authenticated `GET /api/v1/job-agent/extension/download` serves `dealo-apply-copilot.zip` when the package exists on the API host.

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select `apps/apply-extension/dist` (or the unzipped zip)

Keep that folder path stable — Chrome reloads the same unpacked path after rebuilds.

### Chrome Web Store (listing prep)

Full listing pack: [`STORE_LISTING.md`](./STORE_LISTING.md) (copy, permissions justifications, screenshot shot-list, privacy pointers).

Until the public listing ships, set `DEALO_APPLY_EXTENSION_STORE_URL` on the API so Job Agent overview can surface the store link.

## Auth flow

1. Sign in on Dealo (cookie session).
2. Job Agent → Assist queue → **Continue apply**.
3. Dashboard calls `POST /job-agent/device-token`, then handshakes with the extension (`chrome.runtime.sendMessage` / content bridge).
4. Extension stores `Authorization: Bearer dja_…` (30 minutes, in-memory on API).
5. Extension opens the listing URL and fills from `GET /job-agent/assist/:id/session`.

JWT cookie alone is not used on third-party job hosts (cross-site). Device token is the extension path; dashboard session remains cookie JWT.

## Without the extension

Continue apply still shows a **prep pack** (answers + cover note + CV hint) and the existing **I applied** confirm (spends assist credit).

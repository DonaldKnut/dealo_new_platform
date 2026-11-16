# Dealo Apply Copilot (MV3)

Supervised browser assist for `site_assisted` Job Agent matches.

- Pulls vault + drafts via a short-lived `dja_…` device token
- Maps form fields with local rules (+ optional LLM for ambiguous fields)
- **Never auto-submits** — highlights Submit; your click is required
- Pauses on CAPTCHA, SSO/password walls, file pickers, and fee/payment fields
- Reports field coverage back to `POST /job-agent/matches/:id/assist-report`

## Load unpacked

```bash
pnpm --filter @dealo/apply-extension install
pnpm --filter @dealo/apply-extension build
# optional zip for sharing (still load the unzipped dist/ folder in Chrome)
pnpm --filter @dealo/apply-extension package
```

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select `apps/apply-extension/dist`

Keep that folder path stable — Chrome reloads the same unpacked path after rebuilds.

## Auth flow

1. Sign in on Dealo (cookie session).
2. Job Agent → Assist queue → **Continue apply**.
3. Dashboard calls `POST /job-agent/device-token`, then handshakes with the extension (`chrome.runtime.sendMessage` / content bridge).
4. Extension stores `Authorization: Bearer dja_…` (30 minutes, in-memory on API).
5. Extension opens the listing URL and fills from `GET /job-agent/assist/:id/session`.

JWT cookie alone is not used on third-party job hosts (cross-site). Device token is the extension path; dashboard session remains cookie JWT.

## Without the extension

Continue apply still shows a **prep pack** (answers + cover note + CV hint) and the existing **I applied** confirm (spends assist credit).

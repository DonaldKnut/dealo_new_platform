# Chrome Web Store — Dealo Apply Copilot

Sideload zip is already available via `pnpm package` and `GET /job-agent/extension/download`.
This file is the listing pack for Chrome Web Store review.

## Listing copy

| Field | Value |
| --- | --- |
| **Name** | Dealo Apply Copilot |
| **Short description** | Supervised apply: fills career forms from your Dealo vault. Never auto-submits. |
| **Category** | Productivity |
| **Language** | English |

**Detailed description (paste into Store):**

Dealo Apply Copilot helps job seekers finish applications on employer career pages with supervision.

- Pulls your Apply vault (identity, history, Q&A, cover notes) with a short-lived device token from the Dealo dashboard
- Maps form fields with local rules (and optional AI for ambiguous fields)
- Supports multi-step forms, open Shadow DOM, and same-origin iframes
- **Never auto-submits** — you review fills and click Submit yourself
- Pauses on CAPTCHA, SSO/password walls, file pickers, and fee/payment fields
- Does not store third-party passwords

Requires a Dealo account. Open Job Agent → Assist → Continue apply to hand off a listing.

Privacy policy: https://dealonetwork.com/privacy  
Support: https://dealonetwork.com/contact  

## Permissions justification (reviewer notes)

| Permission | Why |
| --- | --- |
| `storage` | Remember API base + short-lived device token for the active Assist session |
| `activeTab` / `scripting` / `tabs` | Open the employer listing and inject the supervised fill overlay on that tab |
| Host access (`https://*/*`) | Career pages live on arbitrary employer domains; fill only runs after an explicit dashboard hand-off for a match URL |

We do **not** bypass CAPTCHA, scrape credentials, or submit forms without the user’s click.

## Screenshots to capture (1280×800 or 640×400)

1. Dashboard Job Agent → Assist queue with **Continue apply**
2. Extension overlay: “Fill from vault” + disclosure
3. Form fields filled with vault values; Submit highlighted (not auto-clicked)
4. Pause state on CAPTCHA / fee field
5. Popup showing connected session / match title

Save under `apps/apply-extension/store-assets/` when ready.

## Before submit

1. Bump `manifest.json` version (e.g. `0.1.0` → `0.1.1`)
2. `pnpm --filter @dealo/apply-extension package`
3. Upload zip from Chrome Developer Dashboard
4. Set `DEALO_APPLY_EXTENSION_STORE_URL` on the API once the listing is live so Job Agent can deep-link to it
5. Single-purpose check: description matches “supervised fill only”

## Privacy

The public site Privacy Policy (`/privacy`) covers account data, vault data, and Assist device tokens.
Extension-specific processing: form values are filled from vault data already stored on Dealo; the extension does not invent answers or upload passwords.

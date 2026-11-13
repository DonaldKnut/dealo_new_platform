# Partner outreach brief — Job Agent sync

Use this when talking to Nigerian job boards and HR tools.

## Pitch (30 seconds)

Dealo Job Agents apply for people using a real CV. If you **push your open jobs** to Dealo with one API call, those agents can apply on your listings. You get a signed webhook and can download the CV. You keep the employer. We never log into your website.

Guide: `https://dealo.ng/developers/job-agent` (or your live domain).

## Who to call first (2–3 targets)

1. **Regional job boards** posting Lagos / Abuja / remote NG roles who want more applicants without building AI.
2. **HR / ATS products** used by SMEs that already have a jobs API or CSV export.
3. **Staffing platforms** that syndicate openings and care about application delivery, not just clicks.

Skip giants that will not partner (e.g. LinkedIn). Prefer teams that already integrate with partners.

## What they gain

- Extra applicants from Dealo talent + Job Agents
- No need to build auto-apply themselves
- Applications land in *their* system (webhook + CV download)
- Brand stays theirs; Dealo is a channel

## What we gain

- More jobs Job Agents can actually submit (not just “open link”)
- Later: monthly or per-apply partner billing (architecture ready; early partners free)
- Stronger reason for job seekers to use Dealo
- Adjacent money lines for employers: temp/contract cover (day rate + mark-up) and post-hire training modules

## Offer for the first partners

- Free test key (`dk_test_…`)
- Help with first sync call on a call / WhatsApp
- Live key after a successful sandbox sync
- Pricing: **EARLY_ACCESS free** while volume proves out (see `PARTNER_API_BILLING` in `@dealo/shared`)
- Later: monthly plan or pay-per-apply — catalogue already defined; metering turns on when volume is real

## Do not promise

- Autofill / login to their site
- Guaranteed hire volume
- Exclusive distribution

## Ask on the call

1. Can you send job create/update/close by API today?
2. Do you already have webhooks inbound?
3. Who owns employer relationships on your board?
4. How many open jobs / month in Nigeria?

## Success = first sync

One partner with open jobs syncing daily and applications flowing back beats ten “interested” emails.

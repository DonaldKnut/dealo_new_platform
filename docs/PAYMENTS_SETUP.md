# Payments (Paystack) and Nigerian job sources

Everything is already built. You only add keys, and each feature switches itself on.

## What Paystack powers

| Product | Who pays | Where they start | What they get |
| --- | --- | --- | --- |
| CV Premium | Job seekers | Premium sheet in the CV builder or Dashboard → My CVs | Premium for `CV_PREMIUM_DAYS` days (default 30) |
| Hiring Agents Pro | Employers | Dashboard → ATS → AI agents → Upgrade | Pro for 30 days (₦25,000) |
| API plans | Developers | Dashboard → Developer | The chosen API plan |

Before keys are added, the buttons fall back to "message us on WhatsApp", so nothing looks broken.

## 1. Get your keys

1. Sign in at [dashboard.paystack.com](https://dashboard.paystack.com).
2. Go to **Settings → API Keys & Webhooks**.
3. Copy the **Secret key** and the **Public key**. Start with the **Test** keys (`sk_test_…`, `pk_test_…`).

## 2. Add them to the API

On Render (or in `apps/api/.env` locally):

```
PAYSTACK_SECRET_KEY=sk_test_xxx
PAYSTACK_PUBLIC_KEY=pk_test_xxx
CV_PREMIUM_PRICE_MINOR=250000   # in kobo: 250000 = ₦2,500
CV_PREMIUM_DAYS=30
```

Restart the API. `GET /api/v1/payments/config` should now show `"enabled": true` and `"mode": "test"`.

## 3. Set the webhook (important)

In the same Paystack page, set **Webhook URL** to:

```
https://dealo-new-platform.vercel.app/api/v1/payments/paystack/webhook
```

(Use your own domain if you have one. The site forwards `/api/v1` to the API.)

Why it matters: if someone pays and closes the tab before coming back, the webhook is what switches their plan on.

How it is kept safe:

- Every webhook must carry Paystack's signature (`x-paystack-signature`, HMAC-SHA512 with your secret key), or it is rejected.
- The API never trusts the webhook body: it asks Paystack to confirm the payment and checks the amount and currency before granting anything.
- Each event is stored once (`PaymentEvent`), so Paystack's retries never grant a plan twice.
- The older URL `/api/v1/billing/paystack/webhook` still works, so either one is fine.

## 4. Test a payment

1. Open the CV builder, pick a premium template and tap **Download**, then **Pay and upgrade**.
2. On Paystack's test page use card `4084 0840 8408 4081`, any future date, CVV `408`, PIN `0000`, OTP `123456`.
3. You come back to **My CVs** with "You are on Premium".

## 5. Go live

Swap in the **Live** keys (`sk_live_…`, `pk_live_…`) and set the webhook URL again on the Live tab in Paystack. That is all.

## For developers: adding a new paid product

1. Pick a reference prefix and add it to `PAYMENT_PREFIX` in `apps/api/src/payments/paystack.client.ts`.
2. Create an invoice row, then call `paystack.initialize(...)` with `newReference(prefix)`.
3. In your service's `onModuleInit`, call `payments.register(prefix, 'product_name', handler)`. The handler receives a verified transaction and must be safe to run twice.

---

# Nigerian jobs on the job board

The board already shows Dealo employers' jobs (mostly in Nigeria) and remote jobs from Remotive, Jobicy and Arbeitnow, which need no keys. The **Jobs in Nigeria** button filters to Nigerian cities and states.

To pull many more Nigerian jobs from local job sites, add one or both free keys to the API:

| Source | What it covers | Get a key | Env name |
| --- | --- | --- | --- |
| Jooble | Jobs from hundreds of Nigerian sites | [ng.jooble.org/api/about](https://ng.jooble.org/api/about) (the key must be for **Nigeria**; keys from other Jooble country sites return no Nigerian jobs) | `JOOBLE_API_KEY` |
| Careerjet | Nigerian listings in English | [careerjet.com.ng/partners](https://www.careerjet.com.ng/partners/) | `CAREERJET_AFFID` |

Restart the API. Jobs appear within a few minutes and refresh every 3 hours. Applying happens on the original site, as each source requires.

Jobberman, MyJobMag and Hot Nigerian Jobs have no public API, so they can't be pulled in directly.

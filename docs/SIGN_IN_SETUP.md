# Setting up "Continue with Google" and "Continue with LinkedIn"

This guide is written step by step. You do not need to write any code. You will:

1. Make sure the website and the API are connected the right way (one time).
2. Create a Google app and copy two keys into Render.
3. Create a LinkedIn app and copy two keys into Render.
4. Test.

Each sign-in button only appears on the Dealo login page once its keys are set, so you can do Google first and LinkedIn later.

Throughout this guide:

- **Your website address** is your Vercel address, for example `https://dealo-new-platform.vercel.app` (or your own domain later, like `https://dealonetwork.com`).
- **Your API address** is your Render address, for example `https://dealo-api.onrender.com`.

Replace these with your real addresses everywhere below.

---

## Part 1 – Connect the website and the API (do this once)

Browsers no longer allow a website to keep you signed in using a cookie that belongs to a *different* website. Our website (vercel.app) and our API (onrender.com) are different websites, so Dealo now sends every API call through the website: the browser calls `your-website/api/v1/...`, and the website passes it on to Render. To the browser, everything comes from one place, so sign-in works.

### On Vercel (the website)

Open your project on vercel.com → **Settings** → **Environment Variables**, and make sure these exist:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://dealo-api.onrender.com/api/v1` (your API address + `/api/v1`) |
| `NEXT_PUBLIC_APP_URL` | your website address, e.g. `https://dealo-new-platform.vercel.app` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | your WhatsApp number with country code, e.g. `2348012345678` |

Do **not** set `NEXT_PUBLIC_API_PROXY` (leave it out). Then go to **Deployments** and click **Redeploy** on the latest one, so the new values are used.

### On Render (the API)

Open your API service on render.com → **Environment**, and set:

| Name | Value |
| --- | --- |
| `APP_URL` | your website address, e.g. `https://dealo-new-platform.vercel.app` |
| `API_URL` | your API address, e.g. `https://dealo-api.onrender.com` |
| `CORS_ORIGIN` | your website address (if you have more than one, separate with commas) |
| `COOKIE_SECURE` | `true` |
| `COOKIE_DOMAIN` | delete it if it exists (leave it empty) |
| `TRUST_PROXY` | `2` (Vercel and Render are two hops in front of the API) |
| `DATABASE_URL` | your MongoDB Atlas connection string (it must be correct, or nothing works) |

Click **Save changes**. Render restarts the API by itself.

**Quick check:** open `your-website/api/v1/auth/providers` in your browser. You should see something like `{"google":false,"linkedin":false}`. If you see that, Part 1 is done. (The free Render plan sleeps when nobody uses it; the first visit can take up to a minute.)

---

## Part 2 – Google

### 2.1 Create the Google project

1. Go to <https://console.cloud.google.com/> and sign in with the Google account that should own Dealo's sign-in.
2. At the top, click the project picker → **New project**. Name it `Dealo` and click **Create**. Make sure the new project is selected at the top.

### 2.2 Set up the consent screen (what people see when they click "Continue with Google")

1. In the left menu, open **APIs & Services** → **OAuth consent screen** (in newer consoles this is called **Google Auth Platform** → **Branding**).
2. Choose **External**, then fill in:
   - **App name:** `Dealo`
   - **User support email:** your email
   - **App logo:** optional (the handshake icon from `apps/web/public/icons/icon-512.png` works well)
   - **App domain / home page:** your website address
   - **Privacy policy:** `your-website/privacy`
   - **Terms of service:** `your-website/terms`
   - **Developer contact email:** your email
3. **Scopes:** add `openid`, `.../auth/userinfo.email` and `.../auth/userinfo.profile`. These are basic and do not need Google's review.
4. **Audience / Publishing status:** while you test, it is "Testing" and only the test users you add can sign in. When you are ready for everyone, click **Publish app**.

### 2.3 Create the keys

1. Go to **APIs & Services** → **Credentials** (or **Google Auth Platform** → **Clients**).
2. Click **Create credentials** → **OAuth client ID**.
3. **Application type:** `Web application`. **Name:** `Dealo web`.
4. Under **Authorised redirect URIs**, click **Add URI** and paste exactly:

   ```
   https://YOUR-WEBSITE/api/v1/auth/google/callback
   ```

   For example: `https://dealo-new-platform.vercel.app/api/v1/auth/google/callback`.
   If you also test on your computer, add a second one: `http://localhost:3000/api/v1/auth/google/callback`.
5. Click **Create**. Google shows a **Client ID** and a **Client secret**. Keep this window open.

> The redirect URI must match exactly: same `https`, no extra slash at the end, and your *website* address (not the Render address).

### 2.4 Put the keys on Render

On Render → your API → **Environment**, add:

| Name | Value |
| --- | --- |
| `GOOGLE_CLIENT_ID` | the Client ID from Google |
| `GOOGLE_CLIENT_SECRET` | the Client secret from Google |

Save. After the API restarts, the **Continue with Google** button appears on the login and sign-up pages.

---

## Part 3 – LinkedIn

### 3.1 You need a LinkedIn Company Page

LinkedIn only gives sign-in keys to apps linked to a Company Page. If Dealo does not have one yet, create it at <https://www.linkedin.com/company/setup/new/> (takes two minutes).

### 3.2 Create the LinkedIn app

1. Go to <https://www.linkedin.com/developers/apps> and click **Create app**.
2. Fill in:
   - **App name:** `Dealo`
   - **LinkedIn Page:** pick Dealo's Company Page
   - **Privacy policy URL:** `your-website/privacy`
   - **App logo:** upload the handshake icon (`apps/web/public/icons/icon-512.png`)
3. Tick the legal agreement and click **Create app**.
4. LinkedIn asks a Page admin to **verify** the app (Settings tab → **Verify**). Send the link to whoever manages the Company Page and have them approve it.

### 3.3 Turn on "Sign In with LinkedIn"

1. Open the **Products** tab of your app.
2. Find **Sign In with LinkedIn using OpenID Connect** and click **Request access**. It is approved straight away.
3. Open the **Auth** tab. Under **OAuth 2.0 scopes** you should now see `openid`, `profile` and `email`.

### 3.4 Add the redirect URL

Still on the **Auth** tab, under **Authorized redirect URLs for your app**, click the pencil, then **Add redirect URL**, and paste exactly:

```
https://YOUR-WEBSITE/api/v1/auth/linkedin/callback
```

For example: `https://dealo-new-platform.vercel.app/api/v1/auth/linkedin/callback`.
For testing on your computer, also add `http://localhost:3000/api/v1/auth/linkedin/callback`. Click **Update**.

### 3.5 Copy the keys to Render

On the **Auth** tab, at the top, you will see **Client ID** and **Primary Client Secret** (click the eye to show it).

On Render → your API → **Environment**, add:

| Name | Value |
| --- | --- |
| `LINKEDIN_CLIENT_ID` | the Client ID from LinkedIn |
| `LINKEDIN_CLIENT_SECRET` | the Primary Client Secret from LinkedIn |

Save. After the restart, **Continue with LinkedIn** appears next to Google.

---

## Part 4 – Test it

1. Open your website in a **private / incognito** window.
2. Go to `your-website/dashboard`. You should be sent to the sign-in page straight away.
3. Click **Continue with Google**, pick your account, and you should land on your dashboard.
4. Sign out, then try **Continue with LinkedIn** the same way.
5. On the sign-up page, choosing "I'm hiring" or "I'm looking for work" before clicking the button decides which kind of account a *new* person gets.

What happens behind the scenes:

- If someone signs in with Google or LinkedIn using an email that already has a Dealo account, they are signed into **that** account (LinkedIn only does this when LinkedIn says the email is verified).
- Their email counts as confirmed, so they can create a hiring workspace and send emails right away.
- They stay signed in for up to 30 days; Dealo quietly renews the sign-in every 15 minutes while they use the site.

---

## If something goes wrong

| What you see | What to do |
| --- | --- |
| No Google/LinkedIn button | The keys are missing on Render, or Render has not restarted yet. Check `your-website/api/v1/auth/providers`. |
| Google: **"redirect_uri_mismatch"** | The redirect URI in Google Cloud is not exactly `https://YOUR-WEBSITE/api/v1/auth/google/callback`. Fix it there (it can take a few minutes to apply). Testing on your computer? Also add `http://localhost:3000/api/v1/auth/google/callback`, and if `GOOGLE_CALLBACK_URL` is set in `apps/api/.env`, add that exact address too (or delete the line so the API uses the localhost:3000 one). |
| LinkedIn: **"The redirect_uri does not match"** | Same idea: fix the URL on the LinkedIn **Auth** tab. |
| Google: **"Access blocked: app has not completed verification"** or only some people can sign in | The consent screen is still in "Testing". Add those people as test users, or click **Publish app**. |
| LinkedIn: **"unauthorized_scope_error"** | The **Sign In with LinkedIn using OpenID Connect** product is not added yet (Part 3.3). |
| Back on the login page with **"sign-in expired. Please try again."** | The sign-in took longer than 10 minutes, or cookies are blocked. Try again; make sure cookies are allowed. |
| Signed in, but the dashboard sends you back to sign in | `COOKIE_DOMAIN` is set on Render (delete it), or `NEXT_PUBLIC_API_URL` on Vercel is wrong. Redeploy Vercel after fixing. |
| Dashboard says **"We can't reach Dealo right now"** | The API on Render is asleep, crashed, or cannot reach the database. Open Render → **Logs**. A database "auth" error means `DATABASE_URL` is wrong. |

Need to change the address later (for example when you move to `dealonetwork.com`)? Update `APP_URL` and `CORS_ORIGIN` on Render, `NEXT_PUBLIC_APP_URL` on Vercel, and add the new redirect URLs in Google and LinkedIn. You can keep the old ones until the move is finished.

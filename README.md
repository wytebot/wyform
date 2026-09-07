# WyForm v3 — cost-controlled form backend

**The 10-Second Backend For Any HTML Form**

WyForm receives HTML form submissions without requiring the site owner to run a backend. It keeps structured submission data in Supabase Postgres and uses the customer's own Google account for Gmail, Sheets and Drive.

## Storage strategy

WyForm does **not** require Cloudflare R2. Attachments are uploaded directly from the visitor's browser to the connected customer's Google Drive using a resumable Google Drive upload session. WyForm stores only file metadata and the Drive link in Postgres. This keeps WyForm's storage footprint tiny and moves file bytes to storage the customer already owns.

If Google Drive is not connected, file metadata can be recorded or uploads can be disabled. The widget does not send file bytes through Vercel.

Retention can automatically delete old submissions and their Drive attachments.

## Free/low-cost features

- One script + `data-wyform` attribute for unlimited forms
- Gmail notifications and auto-responder from the customer's own Google account
- Google Sheets sync
- Google Drive direct attachments
- Honeypot + rate limiting + disposable-email detection
- Duplicate detection
- UTM/campaign capture
- Signed webhooks
- Lead pipeline: New → Contacted → Qualified → Won/Lost
- Form health dashboard
- Delivery retry queue
- Custom success redirect
- Retention cleanup
- CSV export

## Plans

- Free: 100 submissions/month, WyForm branding, 5MB/file
- Starter: ₦5,000 / $5, 1,000 submissions/month, 10MB/file
- Pro: ₦12,000 / $12, 5,000 submissions/month, 25MB/file

## Google OAuth

The Google connection requests:
- `gmail.send`
- `spreadsheets`
- `drive.file`

After deploying this version, reconnect Google so existing users grant the new Drive scope.

## Retry/maintenance

Two Vercel Cron routes are included: daily delivery retry and daily retention cleanup. They are secured with `CRON_SECRET`. Vercel's current Hobby cron limits are daily schedules, so the project intentionally uses daily cron schedules instead of an hourly/minute schedule.

## Environment variables

Server-side Firebase verification also requires `FIREBASE_SERVICE_ACCOUNT_JSON`. After adding payment webhooks, keep the billing status verification endpoint enabled as a fallback for delayed webhooks. Successful payments activate the selected plan for 30 days; expired paid plans fall back to Free limits.

See `.env.example`. Never expose Supabase service role, Google client secret, OAuth encryption key, payment secrets or `CRON_SECRET` in frontend variables.

## Deployment

1. Run the SQL in `supabase-schema.sql`.
2. Configure Vercel environment variables.
3. Deploy.
4. In Google Cloud Console, add `https://formback.ng/api/google-callback` as an OAuth redirect URI.
5. Reconnect Google from **Integrations**.
6. Create a form and install:

```html
<script src="https://formback.ng/widget.js"></script>
<form data-wyform="YOUR_FORM_KEY">
```

## Important

The local environment may not have enough network time to complete `npm install`. Before release, run `npm ci` and `npm run build` in CI/Vercel and inspect the deployment logs.


## WyForm 4.0 upgrade

- Keeps exactly **9 Vercel serverless function entrypoints** under `/api` (below the 10-function limit).
- Additional backend modules continue to route through the same entrypoints.
- Hardened public submission validation and security headers.
- Webhook delivery rejects private/internal destinations using DNS resolution, including IPv6 private/link-local ranges.
- Delivery jobs support atomic `SKIP LOCKED` claiming through `claim_delivery_jobs`, preventing concurrent cron invocations from processing the same job twice when the SQL migration is applied.
- Delivery failures use capped retries with exponential backoff.
- File upload metadata and request sizes are bounded.
- Google, Gmail, Sheets, Drive, Paystack and Flutterwave integrations remain behind the same gateway architecture.

### Vercel function count
`api/` contains 9 physical entrypoint files:
billing.js, email.js, forms.js, google.js, health.js, jobs.js, profile.js, submissions.js, webhooks.js.

**Function budget remaining: 1.**


## Visual Form Builder

WyForm now includes a visual builder for each form endpoint. Users can start from a template or blank form, then add/remove/reorder fields, configure labels, field names, required status, placeholders, help text and options, preview the visitor experience, and copy a complete embed. Supported field types include text, long text, email, phone, number, date, time, URL, dropdown, radio, checkbox, file upload, rating, currency and hidden fields.

The builder stores its field definition in `forms.fields_schema` and does not add another Vercel serverless function.

## Google OAuth production setup

Set these Vercel environment variables:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `OAUTH_ENCRYPTION_KEY` (32+ random characters; use a strong secret)
- `APP_URL` = your exact HTTPS production origin, for example `https://yourdomain.com`
- `GOOGLE_REDIRECT_URI` = `https://yourdomain.com/api/google-callback` (recommended to set explicitly)

In Google Cloud, create a **Web application** OAuth client and add the exact redirect URI above. The URI must match exactly. Also configure the OAuth consent screen with the same production domain, public home page, privacy policy, and terms where applicable.

WyForm requests only:

- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/drive.file`

The browser no longer sends a Firebase ID token in the Google authorization URL. WyForm first authenticates the signed-in user with its backend, then generates a short-lived signed OAuth state and returns the Google authorization URL. OAuth callback state is validated before any Google token is stored.

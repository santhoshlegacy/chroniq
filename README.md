# Chroniq

> **Own your time. Finish what matters.**

Chroniq is a secure, scalable, multi-user productivity Progressive Web App (PWA) designed around an automated check-in rhythm. Built with React 19, TypeScript, Vite, Tailwind CSS, Supabase, and Web Standards.

---

## Architecture Overview

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Zustand
- **PWA**: `vite-plugin-pwa` with `injectManifest` Service Worker, offline caching, and Web Push notifications (VAPID RFC 8291/8292)
- **Design System**: Built following anti-slop app-screen principles with obsidian/graphite surfaces (`#080B12`, `#0E131F`, `#151B28`), crisp typography, and restrained ice-cyan (`#70DFFF`) accents
- **Backend & Auth**: Supabase Auth (Google OAuth), PostgreSQL with strict Row Level Security (RLS), Supabase Edge Functions (Deno runtime), and `pg_cron` automated scheduler
- **Hosting**: GitHub Pages with repository-subpath aware base URL routing

---

## Key Features

1. **Secure Multi-User Task Management**:
   - Full CRUD: Create, read, edit, delete, complete, and reopen tasks.
   - Due dates, priorities (`urgent`, `high`, `medium`, `low`), categories, estimated durations.
   - Comprehensive filtering: Today, Upcoming, Overdue, Completed, All Tasks.
   - Search across task title, description, and tags.
   - Safe offline-to-cloud migration: Users starting offline can migrate their local tasks into their authenticated cloud account with one click.

2. **Automated 5-Slot Reminder Engine**:
   - **Default Schedule**: `09:00`, `12:00`, `15:00`, `18:00`, `21:00` in the user's local IANA timezone.
   - **Fully Customizable**: Add custom time slots, delete slots, or toggle individual slots on/off.
   - **Active Days Selection**: Configure specific days of the week (e.g. weekdays only vs all week).
   - **Quiet Hours**: Suppress notifications during rest hours (e.g., `22:00` to `08:00`), correctly handling midnight crossings.
   - **Task Eligibility**: Choose between all pending tasks, due today/overdue only, or urgent-only check-ins.
   - **Atomic Idempotency**: Edge Function claims slots via `INSERT INTO notification_events (schedule_occurrence_key, ...) ON CONFLICT DO NOTHING`, guaranteeing exactly-once dispatch without double-firing.

3. **Multi-Modal Reminder Delivery Modes**:
   - **Mode 1 — Web Push**: Background notifications delivered even when browser/PWA is closed.
   - **Mode 2 — In-App Spoken Narration**: Client-side Web Speech API narrating pending task count and top priority task with zero external latency or costs.
   - **Mode 3 — Telephony Voice Calls**: Server-side Twilio/Vonage integration architecture requiring explicit user consent and E.164 phone number verification. Outbound calls are processed server-side via Supabase Edge Functions with secret credentials.

---

## Getting Started

### Prerequisites

- Node.js 18+ (Node 22 recommended)
- A Supabase account and project

### Installation

```bash
git clone https://github.com/your-username/chroniq.git
cd chroniq
npm install
```

### Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in your project credentials:

```ini
# Supabase Project API Settings (Supabase Dashboard -> Settings -> API)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-or-anon-key

# Web Push (VAPID) Public Key (Safe in frontend)
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key

# App URL (For local development or custom domain)
VITE_APP_URL=http://localhost:5173
```

> **Security Note**: Never expose Supabase `service_role` keys, database connection passwords, OAuth client secrets, or telephony auth tokens in the frontend or commit `.env` files to git.

---

## Supabase Database Setup & Migrations

Chroniq includes idempotent SQL migrations in `supabase/migrations/`:

| Migration File | Description |
|---|---|
| `001_initial_schema.sql` | Profiles, tasks, notification preferences, push subscriptions, events, RLS policies |
| `002_cron_scheduler.sql` | `pg_cron` minute check job calling `process-reminders` Edge Function |
| `003_custom_schedules_and_voice.sql` | Custom 5-slot schedules, quiet hours, active days, voice & telephony preferences |

### Applying Migrations

#### Option A: Supabase Dashboard SQL Editor (Quickest)
1. Go to your **Supabase Dashboard** -> **SQL Editor**.
2. Run `001_initial_schema.sql`.
3. Go to **Database** -> **Extensions** and ensure `pg_cron` and `pg_net` extensions are enabled.
4. Run `002_cron_scheduler.sql`.
5. Run `003_custom_schedules_and_voice.sql`.

#### Option B: Supabase CLI
```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

---

## Google OAuth Setup

1. In the **Google Cloud Console**:
   - Go to **APIs & Services** -> **Credentials**.
   - Create an **OAuth 2.0 Client ID** (Web Application).
   - Under **Authorized redirect URIs**, add:
     `https://<your-project-ref>.supabase.co/auth/v1/callback`
2. In the **Supabase Dashboard**:
   - Navigate to **Authentication** -> **Providers** -> **Google**.
   - Enable Google and enter your Google **Client ID** and **Client Secret**.
   - Under **Authentication** -> **URL Configuration**:
     - Set **Site URL** to your production URL (e.g. `https://<username>.github.io/chroniq/` or `http://localhost:5173`).
     - Add `http://localhost:5173/*` and your GitHub Pages URL to **Redirect URLs**.

---

## Row-Level Security (RLS) Architecture

Every user-owned table enforces strict Row Level Security:

```sql
-- Pattern enforced across tasks, preferences, and subscriptions:
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks: owner all"
  ON public.tasks
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

- Unauthenticated users receive 0 rows from Supabase queries.
- User A cannot view, mutate, or delete User B's tasks or reminder preferences.
- Edge Functions processing reminders cross-user utilize the protected backend `service_role` key inside Supabase's hosted environment.

---

## Supabase Edge Functions

Chroniq uses two edge functions located in `supabase/functions/`:

1. **`process-reminders`**:
   - Evaluated by `pg_cron` every minute.
   - Determines users who have an active reminder slot due in the current minute window.
   - Evaluates quiet hours, active days of week, and pending tasks.
   - Dispatches Web Push notifications and logs delivery attempts.
2. **`push-subscribe`**:
   - Stores browser push notification endpoints and VAPID keys.

### Deploying Edge Functions
```bash
supabase functions deploy process-reminders --no-verify-jwt
supabase functions deploy push-subscribe
```

Set edge runtime secrets:
```bash
supabase secrets set \
  CHRONIQ_CRON_SECRET="your-secure-secret-string" \
  VAPID_PUBLIC_KEY="your-vapid-public-key" \
  VAPID_PRIVATE_KEY="your-vapid-private-key" \
  VAPID_SUBJECT="mailto:admin@yourdomain.com"
```

---

## Telephony & Voice Reminder Integration

Chroniq provides three distinct reminder modalities:

1. **Push Notifications**: Standard background notifications across Chrome, Edge, and Android PWA.
2. **Spoken Narration (In-App)**: Synthesizes speech via Web Speech API (`speechSynthesis`) directly inside the browser when active. 100% free with zero configuration.
3. **Incoming Phone Calls**: Server-side telephony integration with provider adapters (Twilio / Vonage).
   - Outbound call rates: ~\$0.0140/minute (Twilio) / ~\$0.0139/minute (Vonage).
   - Phone numbers require monthly rental (~$1.00–$1.15/month).
   - Requires explicit user opt-in consent and verified E.164 phone numbers.
   - Provider credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`) remain strictly server-side in Supabase Vault.

---

## Development & Verification

### Running Locally
```bash
npm run dev
```

### Running Automated Tests
```bash
npm test
```
The test suite covers:
- Reminder slot enumeration and custom 5-slot schedule verification
- Cross-midnight quiet hours calculations
- Multi-user RLS data isolation
- E.164 phone number validation
- Timezone conversions and occurrence key duplicate prevention

### Production Build
```bash
npm run build
```

---

## Deployment to GitHub Pages

The repository includes `.github/workflows/deploy.yml` which automatically builds and publishes the production PWA to GitHub Pages on pushes to `main`.

In `vite.config.ts`, repository subpaths are handled automatically:
```ts
const getBasePath = (): string => {
  if (process.env.BASE_PATH) return process.env.BASE_PATH.trim()
  if (process.env.GITHUB_PAGES || process.env.GITHUB_ACTIONS) {
    const rawRepo = process.env.GITHUB_REPOSITORY?.trim()
    const repoName = rawRepo ? rawRepo.split('/')[1]?.trim() : 'chroniq'
    return `/${repoName || 'chroniq'}/`
  }
  return './'
}
```

---

## License

MIT © Chroniq

# ScaleFeedback

A visual bug feedback tool — a [marker.io](https://marker.io) alternative built for the ScaleStation agency. Users embed a lightweight JavaScript widget on any website to capture annotated screenshots and submit feedback directly to a dashboard.

---

## Features

- **Widget** — Lightweight JS snippet embeds on any site; captures annotated screenshots, console logs, and network errors on submission
- **AI Website Scanner** — Headless Chromium crawls a URL and uses GPT-4o vision to detect 8–15 issues per page across accessibility, SEO, UX, technical, and content categories with desktop + mobile screenshots
- **Issue Navigation** — Prev / Next arrow buttons on the issue detail page for quick sequential review
- **ClickUp Integration** — Push AI-scan issues directly to a ClickUp list; two-way status and comment sync via webhooks
- **Role-based Access** — Owner / Admin / Member roles per organisation; guest invite links with expiry
- **Realtime Updates** — Supabase Realtime pushes new feedback to the dashboard without a page refresh
- **Comments & Activity Log** — Internal and public comment threads with `@mention` support; full audit trail

---

## Table of Contents

- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Running the Project](#running-the-project)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [Widget Integration](#widget-integration)
- [AI Website Scanner](#ai-website-scanner)
- [ClickUp Integration](#clickup-integration)
- [Available Routes](#available-routes)

---

## Project Structure

```
ScaleFeedback/
├── apps/
│   └── web/                  # Next.js 14 dashboard (App Router)
│       ├── app/
│       │   ├── (auth)/       # Login & signup pages
│       │   ├── (dashboard)/  # Protected dashboard pages
│       │   └── api/          # API routes (feedback, auth, etc.)
│       ├── components/       # Shared UI components
│       ├── lib/              # Supabase clients, utilities
│       └── public/           # Static assets (widget.js built here)
├── packages/
│   ├── widget/               # Standalone JS widget (Vite IIFE bundle)
│   └── shared/               # Shared TypeScript types
├── supabase/
│   ├── config.toml           # Local Supabase config
│   └── migrations/           # PostgreSQL migrations (run in order)
├── turbo.json                # Turborepo pipeline config
└── package.json              # Root workspace config
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + npm workspaces |
| Dashboard | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Auth | Supabase Auth (Google OAuth) |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Storage | Supabase Storage (screenshot uploads) |
| Widget | Vite (IIFE bundle), html2canvas, Fabric.js |
| AI Scanner | OpenAI GPT-4o vision + Puppeteer (local) / Cheerio (production) |
| Integrations | ClickUp REST API + webhooks |
| Email | Resend (optional) |
| State | Zustand, TanStack Query |

---

## Prerequisites

Make sure you have the following installed:

- **Node.js** >= 18.0.0
- **npm** >= 10.0.0
- **Supabase CLI** (for local development) — [install guide](https://supabase.com/docs/guides/cli)

Install Supabase CLI:

```bash
brew install supabase/tap/supabase
```

---

## Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd ScaleFeedback
```

### 2. Install dependencies

```bash
npm install
```

This installs dependencies for all workspaces (`apps/web`, `packages/widget`, `packages/shared`) in one command.

### 3. Configure environment variables

Copy the example env file for the web app:

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Then fill in the values (see [Environment Variables](#environment-variables) below).

### 4. Set up Supabase

#### Option A — Use Supabase Cloud (recommended for production / quick start)

1. Create a project at [supabase.com](https://supabase.com)
2. Copy your **Project URL**, **Anon Key**, and **Service Role Key** from the Supabase dashboard → Settings → API
3. Paste them into `apps/web/.env.local`
4. Run migrations manually via the Supabase SQL editor or the CLI:

```bash
supabase db push
```

#### Option B — Local Supabase (recommended for development)

```bash
# Start local Supabase stack (requires Docker)
supabase start

# This outputs local credentials — copy them into apps/web/.env.local
```

### 5. Apply database migrations

Migrations live in `supabase/migrations/` and must be applied in order:

| File | Description |
|------|-------------|
| `001_organisations.sql` | Organisations + members tables |
| `002_projects.sql` | Projects table |
| `003_feedback.sql` | Feedback, comments, attachments, activity_log |
| `004_integrations.sql` | Third-party integrations table |
| `005_rls_policies.sql` | Row Level Security policies for all tables |
| `006_auto_org_on_signup.sql` | Trigger to auto-create org on new user signup |

```bash
# Apply all migrations (local)
supabase db push

# Or apply via Supabase dashboard SQL editor — paste each file in order
```

### 6. Configure Google OAuth (Supabase Auth)

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add Authorized redirect URI:
   - Local: `http://localhost:54321/auth/v1/callback`
   - Production: `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. In Supabase dashboard → Authentication → Providers → Google, paste your Client ID and Secret

---

## Running the Project

### Development (all packages in parallel)

From the **root** of the monorepo:

```bash
npm run dev
```

This starts:
- `apps/web` → Next.js dev server at **http://localhost:3000**
- `packages/widget` → Vite watch build (outputs `widget.js` to `apps/web/public/`)

### Run only the dashboard

```bash
cd apps/web
npx next dev
```

### Run only the widget in watch mode

```bash
cd packages/widget
npm run dev
```

### Production build

```bash
npm run build
```

### Start production server

```bash
cd apps/web
npm run start
```

---

## Environment Variables

Create `apps/web/.env.local` with the following:

```env
# Supabase — get from Supabase dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WIDGET_URL=http://localhost:5173

# AI Website Scanner — get from platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-<your-key>

# ClickUp integration (optional) — get from ClickUp → Settings → Apps
CLICKUP_CLIENT_ID=<your-client-id>
CLICKUP_CLIENT_SECRET=<your-client-secret>

# Google OAuth — for Supabase Auth (optional if using email auth only)
SUPABASE_AUTH_GOOGLE_CLIENT_ID=<your-google-client-id>
SUPABASE_AUTH_GOOGLE_SECRET=<your-google-secret>

# Optional: Resend for email notifications
RESEND_API_KEY=re_<your-key>
```

> **Note:** Never commit `.env.local` to version control. The `SUPABASE_SERVICE_ROLE_KEY` has admin-level DB access.

---

## Widget Integration

After setup, the widget bundle is available at `http://localhost:3000/widget.js`.

To embed the widget on any website, add this snippet before `</body>`:

```html
<script
  src="http://localhost:3000/widget.js"
  data-project-id="<your-project-id>"
  data-api-url="http://localhost:3000"
></script>
```

For production, replace `localhost:3000` with your deployed app URL. You can find the install snippet for each project in the dashboard under **Project Settings**.

---

## Available Routes

| Route | Description |
|-------|-------------|
| `/` | Redirects to dashboard or login |
| `/auth/login` | Google OAuth login |
| `/auth/signup` | Sign up page |
| `/(dashboard)/projects` | Projects list |
| `/(dashboard)/projects/[id]` | Feedback list for a project |
| `/(dashboard)/projects/[id]/[feedbackId]` | Issue detail with prev/next navigation |
| `/(dashboard)/projects/[id]/analytics` | Project analytics |
| `/(dashboard)/projects/[id]/settings` | Project settings + widget snippet |
| `/(dashboard)/notifications` | Notification centre |
| `/guest/[projectId]` | Guest feedback view (shareable link) |
| `/api/feedback` | POST — widget submission endpoint |
| `/api/ai-scan` | POST — trigger AI website scan |
| `/api/clickup/push` | POST — push issue to ClickUp |
| `/api/clickup/webhook` | POST — receive ClickUp status/comment events |
| `/api/auth/callback` | Supabase OAuth callback handler |

---

## AI Website Scanner

The scanner crawls a URL with Puppeteer (local) or Cheerio (production/Vercel), takes desktop (1440px) and mobile (375px) screenshots, then sends both to GPT-4o vision for analysis.

**What it checks:**
| Category | Examples |
|----------|---------|
| Accessibility | Missing alt text, unlabelled inputs, low contrast, missing lang attribute |
| SEO | Title/meta description length, missing H1, no canonical tag, missing Open Graph / Twitter Card tags, thin content |
| UX | CTA prominence, visual hierarchy, readability, mobile tap targets |
| Technical | 4xx/5xx errors, console errors, broken resources |
| Content | Placeholder text, broken images, outdated copyright |

**Requirements:**
- `OPENAI_API_KEY` must be set in `apps/web/.env.local`
- Locally, Puppeteer is used automatically (installs Chromium via `puppeteer`)
- On Vercel, the fetch-based crawler is used (no Chromium required)

**Usage:** Open any project in the dashboard → click **Scan Website** → enter the URL → issues are created automatically.

---

## ClickUp Integration

Connect a project to ClickUp to push AI-scan issues as tasks and keep statuses in sync.

### Setup
1. Dashboard → Project Settings → Integrations → Connect ClickUp
2. Authorise via OAuth — select the workspace and list to push tasks into
3. Set `CLICKUP_CLIENT_ID` and `CLICKUP_CLIENT_SECRET` in `.env.local`

### How it works
- **Push:** Owners/Admins can push any AI-scan issue to ClickUp with one click; the ClickUp task URL is stored and shown in the sidebar
- **Status sync:** When a task status changes in ClickUp (via webhook or on page load), ScaleFeedback updates the issue status automatically
- **Comment sync:** Comments added in ClickUp appear in the ScaleFeedback comment thread (prefixed with `[via ClickUp]`)

---

## Available Routes

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all packages in dev mode |
| `npm run build` | Build all packages |
| `npm run lint` | Lint all packages |
| `npm run type-check` | TypeScript type check all packages |
| `npm run clean` | Clean all build artifacts |

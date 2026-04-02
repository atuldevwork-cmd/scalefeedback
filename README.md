# ScaleFeedback

A visual bug feedback tool — a [marker.io](https://marker.io) alternative built for the ScaleStation agency. Users embed a lightweight JavaScript widget on any website to capture annotated screenshots and submit feedback directly to a dashboard.

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
| `/(dashboard)/projects/[id]/feedback` | Feedback list for a project |
| `/(dashboard)/projects/[id]/settings` | Project settings + widget snippet |
| `/api/feedback` | POST endpoint for widget submissions |
| `/api/auth/callback` | Supabase OAuth callback handler |

---

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all packages in dev mode |
| `npm run build` | Build all packages |
| `npm run lint` | Lint all packages |
| `npm run type-check` | TypeScript type check all packages |
| `npm run clean` | Clean all build artifacts |

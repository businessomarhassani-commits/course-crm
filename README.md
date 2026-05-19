# Course CRM

A production-ready SaaS CRM for online education and course selling businesses.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Deployment**: Vercel

## Features

- **Dashboard** — Revenue charts, lead stats, conversion tracking, activity feed
- **Leads** — Full lead management with pipeline, WhatsApp integration, CSV export
- **Sales** — Track sales, link to leads, refund management
- **Payments** — Payment tracking with proof upload (Bank, Cash, Stripe, Partial)
- **Tasks** — Task management with due dates, urgency indicators
- **Content Tracking** — Track ad creatives with CTR, CPL, ROAS
- **Team** — Team management with role-based access (Admin, Closer, Partner, Support)
- **Global Search** — Search across leads, sales, and tasks
- **Dark/Light Mode** — Premium dark-first design

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/hassaniomar759/course-crm.git
cd course-crm
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Seed demo data

After registering your admin account, POST to `/api/seed` to create demo leads, sales, and tasks.

## Roles

| Role | Permissions |
|------|-------------|
| Admin | Full access to everything |
| Closer | View/edit assigned leads only |
| Partner | View all leads, view sales |
| Support | View all leads |

## First User = Admin

The first user to register automatically gets the `admin` role via a database trigger.

## Demo Login

- **Email**: `demo@coursecrm.com`
- **Password**: `demo123456`

## Live URL

https://course-crm.vercel.app

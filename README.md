# ViTeach

ViTeach is a hackathon MVP for Track 3 Vietnam Impact. Teachers can upload an existing LMS score CSV, then Lumi analyzes class risk, score trends, and suggested interventions in Vietnamese.

This workspace was generated with Nx using a Next.js app in `apps/web`.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:4200`.

## Environment

Copy `.env.example` to `.env.local` or configure Vercel variables:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DEMO_TEACHER_EMAIL=demo.teacher@viteach.app
DEMO_TEACHER_PASSWORD=DemoTeacher#2026
DEMO_TEACHER_WORKSPACE_ID=ws_demo_teacher
```

The dashboard still works without OpenAI or Supabase credentials by using deterministic local analysis and fallback Lumi responses.

## Supabase teacher login (demo)

This project now uses Supabase Auth for teacher login in the web UI.

1. Apply DB migrations (including `005_teacher_auth_seed.sql`) to your Supabase project.
2. Seed the demo teacher auth account:

```bash
npm run seed:demo-teacher
```

3. Run the app and sign in with:

```bash
Email: demo.teacher@viteach.app
Password: DemoTeacher#2026
```

## GitHub CI/CD to Vercel

The workflow at `.github/workflows/vercel.yml` runs typecheck, lint, tests, and build on pull requests and pushes to `main`.

For deployments, configure these GitHub repository secrets:

```bash
VERCEL_TOKEN=...
VERCEL_ORG_ID=...
VERCEL_PROJECT_ID=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

In Vercel, link the project to this repository with the repository root as the project root. Use the Next.js framework preset. If Vercel shows an Output Directory value like `public`, clear it or set it to `apps/web/.next`; `vercel.json` also pins this for CI deploys.

Add the app runtime environment variables in Vercel as well:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## CSV format

The MVP supports a simple wide CSV with one row per student:

`student_id, student_name, gender, class_name, oral_score, score_15m, bonus, penalty, midterm, final, practice, project, class_activity, attendance, homework_missing, participation`

A built-in class `10A1` sample is loaded by default for judging.

## Example CSV files (5)

Ready-to-import files are available in `apps/web/public/examples`:

- `example-1-math-grade10.csv`
- `example-2-physics-grade10.csv`
- `example-3-english-grade11.csv`
- `example-4-chemistry-grade12.csv`
- `example-5-homeroom-mixed-risk.csv`

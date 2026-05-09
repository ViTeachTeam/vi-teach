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
```

The dashboard still works without OpenAI or Supabase credentials by using deterministic local analysis and fallback Lumi responses.

## CSV format

The MVP supports a simple wide CSV with one row per student:

`student_id, student_name, gender, class_name, oral_score, score_15m, bonus, penalty, midterm, final, practice, project, class_activity, attendance, homework_missing, participation`

A built-in class `10A1` sample is loaded by default for judging.

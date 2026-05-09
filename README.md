# ViTeach

ViTeach is a hackathon MVP for Track 3 Vietnam Impact. Teachers can upload an existing LMS score CSV, then Lumi analyzes class risk, score trends, and suggested interventions. The app is fully bilingual in English and Vietnamese.

This workspace was generated with Nx using a Next.js app in `apps/web`.

## Features

- **Multilingual Dashboard**: Full English/Vietnamese support across the UI
- **Supabase Auth**: Teacher login and profile management
- **CSV Upload & Analysis**: Import class data and get instant risk analysis
- **KPI Dashboard**: View total students, risk distribution, and potential students at a glance
- **Floating Chat Widget**: Ask Lumi (AI assistant) for support plans and teaching suggestions in the bottom-right corner
- **Risk Distribution**: Donut chart showing high/medium/low risk breakdowns
- **Student Insights**: Separate panels for students requiring attention and potential students ready for enrichment
- **Trend Analysis**: Per-student score trend charts with risk reasons and Lumi-generated suggestions
- **Demo Data**: 5 example CSV files pre-configured with Vietnam high school classes

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

This project uses Supabase Auth for teacher login in the web UI.

### Single demo teacher
1. Apply DB migrations (including `005_teacher_auth_seed.sql`) to your Supabase project.
2. Seed the demo teacher:

```bash
npm run seed:demo-teacher
```

3. Sign in with:
```bash
Email: demo.teacher@viteach.app
Password: DemoTeacher#2026
```

### Multiple demo teachers (recommended for judging)
For a richer demo experience, seed 10 demo teachers:

```bash
npm run seed:multiple-teachers
```

This creates 10 teachers with demo classes and normalized workspace IDs (`ws_teacher_1` through `ws_teacher_10`). Each teacher has login credentials in the format:
```bash
Email: teacher.N@viteach.app  (where N = 1-10)
Password: TeacherN#2026        (where N = 1-10)
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
SUPABASE_SERVICE_ROLE_KEY=...
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

## Dashboard UI

The dashboard includes:

- **KPI Strip**: 6 high-contrast cards showing total students, students needing support, risk distribution (high/medium/low), and potential students
- **Risk Distribution Chart**: Donut visualization of risk levels with percentage breakdown
- **Top Class Issues**: Horizontal bar chart of the most common issues affecting the class
- **Action Suggestions**: Lumi-generated teaching suggestions with a link to detailed plans
- **Student Lists**: Separate attention and potential student rows with risk/enrichment indicators
- **Student Details**: Per-student trend charts, risk reasons, and Lumi suggestions
- **Floating Chat Widget** (bottom-right): Ask Lumi questions about support plans, teaching strategies, and student-specific advice

## CSV format

The MVP supports CSV files with one row per student. Supported formats include:

- **Column names**: English or Vietnamese headers, with common synonyms recognized
- **Delimiters**: Comma (`,`) or semicolon (`;`)
- **Decimals**: Dot (`.`) or comma (`,`) as decimal separator

Example columns:
```
student_id, student_name, gender, class_name, oral_score, score_15m, bonus, penalty, midterm, final, practice, project, class_activity, attendance, homework_missing, participation
```

Or in Vietnamese:
```
mã_học_sinh, tên_học_sinh, giới_tính, tên_lớp, điểm_nói, điểm_15p, điểm_cộng, điểm_trừ, giữa_kì, cuối_kì, thực_hành, dự_án, hoạt_động_lớp, điểm_danh, bài_tập_quên, tham_gia
```

A built-in sample class is loaded by default for judging.

## Example CSV files (5)

Ready-to-import files are in `apps/web/public/examples`:

- `example-1-math-grade10.csv` – Math class, grade 10
- `example-2-physics-grade10.csv` – Physics class, grade 10
- `example-3-english-grade11.csv` – English class, grade 11
- `example-4-chemistry-grade12.csv` – Chemistry class, grade 12
- `example-5-homeroom-mixed-risk.csv` – Homeroom with mixed risk distribution, grade 10

All files use Vietnamese header names and semicolon delimiters to match Vietnam LMS export formats.

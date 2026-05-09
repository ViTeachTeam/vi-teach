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

Ready-to-import example files are available in `apps/web/public/examples/`:

- [example-1-math-grade10.csv](apps/web/public/examples/example-1-math-grade10.csv) – Math class, grade 10, 20 students
- [example-2-physics-grade10.csv](apps/web/public/examples/example-2-physics-grade10.csv) – Physics class, grade 10, 18 students
- [example-3-english-grade11.csv](apps/web/public/examples/example-3-english-grade11.csv) – English class, grade 11, 22 students
- [example-4-chemistry-grade12.csv](apps/web/public/examples/example-4-chemistry-grade12.csv) – Chemistry class, grade 12, 19 students
- [example-5-homeroom-mixed-risk.csv](apps/web/public/examples/example-5-homeroom-mixed-risk.csv) – Homeroom with mixed risk distribution, grade 10, 20 students

All files use Vietnamese header names and semicolon delimiters to match Vietnam LMS export formats.

## Testing Guide

### Quick Start (No Auth Required)
1. Run `npm run dev` and open `http://localhost:4200`
2. You'll see the dashboard with a built-in sample class (10A1 with 20 students)
3. Try uploading one of the example CSV files using the "Upload Data" button
4. Switch between English and Vietnamese using the language toggle in the top-right menu

### Test with Demo Teachers
1. Seed demo teachers:
   ```bash
   npm run seed:multiple-teachers
   ```
2. Visit the login page and sign in with any teacher:
   ```
   Email: teacher.1@viteach.app
   Password: TeacherDemo#2026
   ```
   (or teacher.2, teacher.3, etc.)
3. Each teacher has a pre-loaded 10A1 class with sample data

### Testing CSV Upload
1. Click "Upload Data" on the dashboard
2. Select one of the example CSV files from `apps/web/public/examples/`
3. Wait for analysis to complete (shows animated loading modal)
4. Dashboard updates with new analysis, KPIs, and risk distribution
5. Click on a student in the "Students Requiring Attention" list to see detailed risk reasons and trend chart
6. Use Lumi chat widget (bottom-right) to ask follow-up questions about the class

### Testing Language Switching
1. Click the teacher profile menu (top-right)
2. Select "Language" section
3. Toggle between "Tiếng Việt" and "English"
4. All UI, suggestions, and analysis text updates immediately
5. Language preference is saved to browser localStorage

### Testing Lumi Chat
1. Open the floating chat widget (bottom-right: "Chat with ViTeach")
2. Ask questions like:
   - "How should I address the high-risk students?"
   - "What patterns do you see in the class data?"
   - "Tôi nên làm gì với các học sinh khó khăn?" (Vietnamese)
3. Lumi responds with suggestions based on class analysis
4. All chat history is preserved in the chat panel

### Testing Without OpenAI
The app works fully without OpenAI credentials:
- Analysis pipeline runs locally
- Lumi returns sensible fallback suggestions based on deterministic rules
- Chat widget provides helpful responses using fallback logic
- Set `OPENAI_API_KEY` to test with live OpenAI API

### Testing Multilingual Support
- **All** UI elements support English and Vietnamese
- Dashboard, KPIs, student lists, risk reasons, and suggestions all translate
- Language preference persists across sessions
- Try uploading CSV files in Vietnamese format with Vietnamese headers

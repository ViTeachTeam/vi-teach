create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'demo',
  name text not null,
  subject text default 'Toán',
  teacher_name text default 'Nguyễn Thị Lan',
  created_at timestamptz not null default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'demo',
  class_name text not null,
  student_code text not null,
  full_name text not null,
  gender text,
  created_at timestamptz not null default now()
);

create table if not exists score_uploads (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'demo',
  class_name text not null,
  file_name text,
  row_count integer not null default 0,
  raw_preview jsonb,
  created_at timestamptz not null default now()
);

create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'demo',
  class_name text not null,
  computed_analysis jsonb not null,
  lumi_analysis jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'demo',
  class_name text not null,
  role text not null default 'teacher',
  content text not null,
  assistant_content text,
  created_at timestamptz not null default now()
);

alter table classes enable row level security;
alter table students enable row level security;
alter table score_uploads enable row level security;
alter table analyses enable row level security;
alter table chat_messages enable row level security;

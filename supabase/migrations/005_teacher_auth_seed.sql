create table if not exists teacher_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null,
  full_name text not null,
  subject text,
  school_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table teacher_profiles enable row level security;

create unique index if not exists idx_teacher_profiles_user_id_unique
  on teacher_profiles (user_id);

create unique index if not exists idx_teacher_profiles_workspace_id_unique
  on teacher_profiles (workspace_id);

drop policy if exists teacher_profiles_select_own on teacher_profiles;
drop policy if exists teacher_profiles_update_own on teacher_profiles;
create policy teacher_profiles_select_own on teacher_profiles
  for select using (auth.uid() = user_id);
create policy teacher_profiles_update_own on teacher_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'teacher_profiles_workspace_id_nonempty') then
    alter table teacher_profiles
      add constraint teacher_profiles_workspace_id_nonempty
      check (length(trim(workspace_id)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'teacher_profiles_full_name_nonempty') then
    alter table teacher_profiles
      add constraint teacher_profiles_full_name_nonempty
      check (length(trim(full_name)) > 0);
  end if;
end $$;

insert into teacher_profiles (user_id, workspace_id, full_name, subject, school_name)
select
  u.id,
  'ws_demo_teacher',
  'Nguyen Thi Lan',
  'Mathematics',
  'Vietnam Impact High School'
from auth.users u
where u.email = 'demo.teacher@viteach.app'
  and not exists (
    select 1
    from teacher_profiles tp
    where tp.user_id = u.id
  );

insert into classes (workspace_id, name, subject, teacher_name)
select
  'ws_demo_teacher',
  '10A1',
  'Mathematics',
  'Nguyen Thi Lan'
where not exists (
  select 1
  from classes
  where workspace_id = 'ws_demo_teacher'
    and name = '10A1'
);

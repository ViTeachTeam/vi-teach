create table if not exists api_audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  endpoint text not null,
  request_id text not null,
  status_code integer not null,
  duration_ms integer not null,
  rate_limited boolean not null default false,
  ip_address text,
  user_agent text,
  error_message text,
  created_at timestamptz not null default now()
);

alter table api_audit_logs enable row level security;

drop policy if exists api_audit_logs_select_workspace on api_audit_logs;
drop policy if exists api_audit_logs_insert_workspace on api_audit_logs;
create policy api_audit_logs_select_workspace on api_audit_logs
  for select using (workspace_id = app.current_workspace_id());
create policy api_audit_logs_insert_workspace on api_audit_logs
  for insert with check (workspace_id = app.current_workspace_id());

create index if not exists idx_api_audit_logs_workspace_endpoint_created_at
  on api_audit_logs (workspace_id, endpoint, created_at desc);

create index if not exists idx_api_audit_logs_workspace_status_created_at
  on api_audit_logs (workspace_id, status_code, created_at desc);

create index if not exists idx_api_audit_logs_request_id
  on api_audit_logs (request_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'api_audit_logs_workspace_id_nonempty') then
    alter table api_audit_logs
      add constraint api_audit_logs_workspace_id_nonempty
      check (length(trim(workspace_id)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'api_audit_logs_endpoint_nonempty') then
    alter table api_audit_logs
      add constraint api_audit_logs_endpoint_nonempty
      check (length(trim(endpoint)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'api_audit_logs_request_id_nonempty') then
    alter table api_audit_logs
      add constraint api_audit_logs_request_id_nonempty
      check (length(trim(request_id)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'api_audit_logs_status_code_valid') then
    alter table api_audit_logs
      add constraint api_audit_logs_status_code_valid
      check (status_code >= 100 and status_code <= 599);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'api_audit_logs_duration_nonnegative') then
    alter table api_audit_logs
      add constraint api_audit_logs_duration_nonnegative
      check (duration_ms >= 0);
  end if;
end $$;

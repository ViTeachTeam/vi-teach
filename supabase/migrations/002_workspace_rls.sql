create schema if not exists app;

create or replace function app.current_workspace_id()
returns text
language sql
stable
as $$
  select coalesce(
    nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'workspace_id'), ''),
    nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'app_metadata' ->> 'workspace_id'), '')
  );
$$;

grant usage on schema app to anon, authenticated;
grant execute on function app.current_workspace_id() to anon, authenticated;

drop policy if exists classes_select_workspace on classes;
drop policy if exists classes_insert_workspace on classes;
drop policy if exists classes_update_workspace on classes;
drop policy if exists classes_delete_workspace on classes;
create policy classes_select_workspace on classes for select using (workspace_id = app.current_workspace_id());
create policy classes_insert_workspace on classes for insert with check (workspace_id = app.current_workspace_id());
create policy classes_update_workspace on classes for update using (workspace_id = app.current_workspace_id()) with check (workspace_id = app.current_workspace_id());
create policy classes_delete_workspace on classes for delete using (workspace_id = app.current_workspace_id());

drop policy if exists students_select_workspace on students;
drop policy if exists students_insert_workspace on students;
drop policy if exists students_update_workspace on students;
drop policy if exists students_delete_workspace on students;
create policy students_select_workspace on students for select using (workspace_id = app.current_workspace_id());
create policy students_insert_workspace on students for insert with check (workspace_id = app.current_workspace_id());
create policy students_update_workspace on students for update using (workspace_id = app.current_workspace_id()) with check (workspace_id = app.current_workspace_id());
create policy students_delete_workspace on students for delete using (workspace_id = app.current_workspace_id());

drop policy if exists score_uploads_select_workspace on score_uploads;
drop policy if exists score_uploads_insert_workspace on score_uploads;
drop policy if exists score_uploads_update_workspace on score_uploads;
drop policy if exists score_uploads_delete_workspace on score_uploads;
create policy score_uploads_select_workspace on score_uploads for select using (workspace_id = app.current_workspace_id());
create policy score_uploads_insert_workspace on score_uploads for insert with check (workspace_id = app.current_workspace_id());
create policy score_uploads_update_workspace on score_uploads for update using (workspace_id = app.current_workspace_id()) with check (workspace_id = app.current_workspace_id());
create policy score_uploads_delete_workspace on score_uploads for delete using (workspace_id = app.current_workspace_id());

drop policy if exists analyses_select_workspace on analyses;
drop policy if exists analyses_insert_workspace on analyses;
drop policy if exists analyses_update_workspace on analyses;
drop policy if exists analyses_delete_workspace on analyses;
create policy analyses_select_workspace on analyses for select using (workspace_id = app.current_workspace_id());
create policy analyses_insert_workspace on analyses for insert with check (workspace_id = app.current_workspace_id());
create policy analyses_update_workspace on analyses for update using (workspace_id = app.current_workspace_id()) with check (workspace_id = app.current_workspace_id());
create policy analyses_delete_workspace on analyses for delete using (workspace_id = app.current_workspace_id());

drop policy if exists chat_messages_select_workspace on chat_messages;
drop policy if exists chat_messages_insert_workspace on chat_messages;
drop policy if exists chat_messages_update_workspace on chat_messages;
drop policy if exists chat_messages_delete_workspace on chat_messages;
create policy chat_messages_select_workspace on chat_messages for select using (workspace_id = app.current_workspace_id());
create policy chat_messages_insert_workspace on chat_messages for insert with check (workspace_id = app.current_workspace_id());
create policy chat_messages_update_workspace on chat_messages for update using (workspace_id = app.current_workspace_id()) with check (workspace_id = app.current_workspace_id());
create policy chat_messages_delete_workspace on chat_messages for delete using (workspace_id = app.current_workspace_id());

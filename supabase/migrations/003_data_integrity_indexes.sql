create index if not exists idx_classes_workspace_created_at
  on classes (workspace_id, created_at desc);

create index if not exists idx_students_workspace_class_created_at
  on students (workspace_id, class_name, created_at desc);

create unique index if not exists idx_students_workspace_class_code_unique
  on students (workspace_id, class_name, student_code);

create index if not exists idx_score_uploads_workspace_class_created_at
  on score_uploads (workspace_id, class_name, created_at desc);

create index if not exists idx_analyses_workspace_class_created_at
  on analyses (workspace_id, class_name, created_at desc);

create index if not exists idx_chat_messages_workspace_class_created_at
  on chat_messages (workspace_id, class_name, created_at desc);

create index if not exists idx_chat_messages_workspace_role_created_at
  on chat_messages (workspace_id, role, created_at desc);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'classes_workspace_id_nonempty') then
    alter table classes
      add constraint classes_workspace_id_nonempty
      check (length(trim(workspace_id)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'classes_name_nonempty') then
    alter table classes
      add constraint classes_name_nonempty
      check (length(trim(name)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'students_workspace_id_nonempty') then
    alter table students
      add constraint students_workspace_id_nonempty
      check (length(trim(workspace_id)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'students_class_name_nonempty') then
    alter table students
      add constraint students_class_name_nonempty
      check (length(trim(class_name)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'students_student_code_nonempty') then
    alter table students
      add constraint students_student_code_nonempty
      check (length(trim(student_code)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'students_full_name_nonempty') then
    alter table students
      add constraint students_full_name_nonempty
      check (length(trim(full_name)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'score_uploads_workspace_id_nonempty') then
    alter table score_uploads
      add constraint score_uploads_workspace_id_nonempty
      check (length(trim(workspace_id)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'score_uploads_class_name_nonempty') then
    alter table score_uploads
      add constraint score_uploads_class_name_nonempty
      check (length(trim(class_name)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'score_uploads_row_count_nonnegative') then
    alter table score_uploads
      add constraint score_uploads_row_count_nonnegative
      check (row_count >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'analyses_workspace_id_nonempty') then
    alter table analyses
      add constraint analyses_workspace_id_nonempty
      check (length(trim(workspace_id)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'analyses_class_name_nonempty') then
    alter table analyses
      add constraint analyses_class_name_nonempty
      check (length(trim(class_name)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chat_messages_workspace_id_nonempty') then
    alter table chat_messages
      add constraint chat_messages_workspace_id_nonempty
      check (length(trim(workspace_id)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chat_messages_class_name_nonempty') then
    alter table chat_messages
      add constraint chat_messages_class_name_nonempty
      check (length(trim(class_name)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chat_messages_content_nonempty') then
    alter table chat_messages
      add constraint chat_messages_content_nonempty
      check (length(trim(content)) > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chat_messages_role_allowed') then
    alter table chat_messages
      add constraint chat_messages_role_allowed
      check (role in ('teacher', 'lumi'));
  end if;
end $$;

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const email = process.env.DEMO_TEACHER_EMAIL || 'demo.teacher@viteach.app';
const password = process.env.DEMO_TEACHER_PASSWORD || 'DemoTeacher#2026';
const workspaceId = process.env.DEMO_TEACHER_WORKSPACE_ID || 'ws_demo_teacher';
const fullName = process.env.DEMO_TEACHER_FULL_NAME || 'Nguyen Thi Lan';
const subject = process.env.DEMO_TEACHER_SUBJECT || 'Mathematics';
const schoolName = process.env.DEMO_TEACHER_SCHOOL || 'Vietnam Impact High School';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) / SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  let userId;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { workspace_id: workspaceId }
  });

  if (createError && !createError.message.toLowerCase().includes('already')) {
    throw createError;
  }

  if (created?.user?.id) {
    userId = created.user.id;
  }

  if (!userId) {
    const { data: usersPage, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (listError) throw listError;

    const existing = usersPage.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (!existing) {
      throw new Error(`Unable to find existing user for ${email}`);
    }

    userId = existing.id;
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    password,
    user_metadata: { full_name: fullName },
    app_metadata: { workspace_id: workspaceId }
  });

  if (updateError) throw updateError;

  const { error: profileError } = await admin.from('teacher_profiles').upsert(
    {
      user_id: userId,
      workspace_id: workspaceId,
      full_name: fullName,
      subject,
      school_name: schoolName
    },
    { onConflict: 'user_id' }
  );

  if (profileError) throw profileError;

  const { data: classRows, error: classSelectError } = await admin
    .from('classes')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('name', '10A1')
    .limit(1);

  if (classSelectError) throw classSelectError;

  if (!classRows || classRows.length === 0) {
    const { error: classInsertError } = await admin.from('classes').insert({
      workspace_id: workspaceId,
      name: '10A1',
      subject,
      teacher_name: fullName
    });

    if (classInsertError) throw classInsertError;
  }

  console.log('Demo teacher ready');
  console.log(`email=${email}`);
  console.log(`password=${password}`);
  console.log(`workspace_id=${workspaceId}`);
}

main().catch((error) => {
  console.error('Seed failed:', error.message || error);
  process.exit(1);
});

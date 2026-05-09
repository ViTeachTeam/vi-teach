import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

const teachers = [
  { email: 'teacher.1@viteach.app', name: 'Nguyen Thi Lan', subject: 'Mathematics', school: 'Vietnam Impact High School' },
  { email: 'teacher.2@viteach.app', name: 'Tran Van Duc', subject: 'Physics', school: 'Vietnam Impact High School' },
  { email: 'teacher.3@viteach.app', name: 'Le Thi Huong', subject: 'English', school: 'Vietnam Impact High School' },
  { email: 'teacher.4@viteach.app', name: 'Pham Minh Tuan', subject: 'Chemistry', school: 'Vietnam Impact High School' },
  { email: 'teacher.5@viteach.app', name: 'Hoang Thi Thu', subject: 'Biology', school: 'Vietnam Impact High School' },
  { email: 'teacher.6@viteach.app', name: 'Vu Van Hieu', subject: 'History', school: 'Vietnam Impact High School' },
  { email: 'teacher.7@viteach.app', name: 'Dang Thi Linh', subject: 'Geography', school: 'Vietnam Impact High School' },
  { email: 'teacher.8@viteach.app', name: 'Bui Van Tuan', subject: 'Literature', school: 'Vietnam Impact High School' },
  { email: 'teacher.9@viteach.app', name: 'Nguyen Thi Tuyet', subject: 'Homeroom', school: 'Vietnam Impact High School' },
  { email: 'teacher.10@viteach.app', name: 'Tran Duc Phuong', subject: 'Physical Education', school: 'Vietnam Impact High School' }
];

const password = 'TeacherDemo#2026';

async function seedTeacher(teacher) {
  const { email, name, subject, school } = teacher;
  const workspaceId = `ws_${email
    .split('@')[0]
    .replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  try {
    let userId;

    // Try to create user
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
      app_metadata: { workspace_id: workspaceId }
    });

    if (createError && !createError.message.toLowerCase().includes('already')) {
      throw createError;
    }

    if (created?.user?.id) {
      userId = created.user.id;
    }

    // If user already exists, find their ID
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

    // Update user
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      password,
      user_metadata: { full_name: name },
      app_metadata: { workspace_id: workspaceId }
    });

    if (updateError) throw updateError;

    // Upsert teacher profile
    const { error: profileError } = await admin.from('teacher_profiles').upsert(
      {
        user_id: userId,
        workspace_id: workspaceId,
        full_name: name,
        subject,
        school_name: school
      },
      { onConflict: 'user_id' }
    );

    if (profileError) throw profileError;

    // Ensure class exists
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
        teacher_name: name
      });

      if (classInsertError) throw classInsertError;
    }

    console.log(`✓ Teacher ${name} (${email}) seeded successfully`);
    return { email, password, workspaceId, success: true };
  } catch (error) {
    console.error(`✗ Failed to seed ${email}:`, error.message || error);
    return { email, password, workspaceId, success: false, error: error.message };
  }
}

async function main() {
  console.log(`\nSeeding ${teachers.length} demo teachers...\n`);

  const results = [];
  for (const teacher of teachers) {
    const result = await seedTeacher(teacher);
    results.push(result);
  }

  console.log('\n' + '='.repeat(60));
  console.log('DEMO TEACHERS SEEDED');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success);
  console.log(`\n✓ Successfully created: ${successful.length}/${teachers.length}`);

  console.log('\nLogin credentials (all teachers):');
  console.log(`Password: ${password}\n`);

  successful.forEach((r, idx) => {
    console.log(`${idx + 1}. Email: ${r.email}`);
    console.log(`   Workspace: ${r.workspaceId}\n`);
  });

  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    console.log(`\n⚠ Failed: ${failed.length} teacher(s)`);
    failed.forEach(f => {
      console.log(`   - ${f.email}: ${f.error}`);
    });
  }
}

main().catch((error) => {
  console.error('Seed failed:', error.message || error);
  process.exit(1);
});

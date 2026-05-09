'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AlertCircle, LogIn } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dashboard } from './Dashboard';
import { getSupabaseBrowserClient } from '../lib/supabaseClient';

type TeacherProfile = {
  workspace_id: string;
  full_name: string;
};

export function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const clientError = useMemo(() => {
    try {
      getSupabaseBrowserClient();
      return '';
    } catch (err) {
      return err instanceof Error ? err.message : 'Supabase configuration is missing.';
    }
  }, []);

  useEffect(() => {
    if (clientError) {
      setLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();

    const setup = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setError(sessionError.message);
      }
      setSession(data.session ?? null);
      setLoading(false);
    };

    void setup();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [clientError]);

  useEffect(() => {
    if (!session?.user || clientError) {
      setProfile(null);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const workspaceFallback = `ws_${session.user.id.replace(/-/g, '').slice(0, 16)}`;

    const loadProfile = async () => {
      const { data, error: profileError } = await supabase
        .from('teacher_profiles')
        .select('workspace_id, full_name')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
      }

      if (data) {
        setProfile(data as TeacherProfile);
      } else {
        const fullName = (session.user.user_metadata?.full_name as string | undefined) || 'Teacher';
        setProfile({ workspace_id: workspaceFallback, full_name: fullName });
      }
    };

    void loadProfile();
  }, [session, clientError]);

  async function signIn() {
    if (clientError) return;
    setSubmitting(true);
    setError('');

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (signInError) {
        setError(signInError.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    if (clientError) return;
    const supabase = getSupabaseBrowserClient();
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
    }
  }

  if (loading) {
    return (
      <main className="auth-shell">
        <Card className="auth-card">
          <CardHeader>
            <CardTitle>Loading teacher workspace...</CardTitle>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (clientError) {
    return (
      <main className="auth-shell">
        <Card className="auth-card">
          <CardHeader>
            <CardTitle>Supabase is not configured</CardTitle>
            <CardDescription>Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Missing environment variables</AlertTitle>
              <AlertDescription>{clientError}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="auth-shell">
        <Card className="auth-card">
          <CardHeader>
            <CardTitle>Teacher Portal</CardTitle>
            <CardDescription>Sign in to access your classes and AI insights.</CardDescription>
          </CardHeader>
          <CardContent className="auth-form">
            <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
            <Input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" />
            {error ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>Cannot sign in</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <p className="auth-note">Need access? Contact your school admin.</p>
            <Button disabled={submitting} onClick={() => void signIn()}>
              <LogIn />
              {submitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <Dashboard
      workspaceIdOverride={profile?.workspace_id}
      teacherNameOverride={profile?.full_name || session.user.email || 'Teacher'}
      teacherEmail={session.user.email || undefined}
      onSignOut={signOut}
    />
  );
}

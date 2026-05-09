import type { ClassAnalysis, LumiAnalysis } from '../types/score';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let warnedMissingConfig = false;

export async function persistAnalysis(analysis: ClassAnalysis, lumi: LumiAnalysis) {
  if (!isConfigured()) return;

  await postJson('analyses', {
    workspace_id: 'demo',
    class_name: analysis.className,
    computed_analysis: analysis,
    lumi_analysis: lumi
  });
}

export async function persistChat(className: string, question: string, answer: string) {
  if (!isConfigured()) return;

  await postJson('chat_messages', {
    workspace_id: 'demo',
    class_name: className,
    role: 'teacher',
    content: question,
    assistant_content: answer
  });
}

function headers() {
  return {
    apikey: serviceKey as string,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal'
  };
}

function isConfigured() {
  if (url && serviceKey) return true;
  if (!warnedMissingConfig) {
    warnedMissingConfig = true;
    console.warn('Supabase persistence skipped because NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.');
  }
  return false;
}

async function postJson(table: string, payload: Record<string, unknown>) {
  try {
    const response = await fetch(`${url}/rest/v1/${table}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error(`Supabase persist failed for ${table}: ${response.status} ${response.statusText} ${detail}`);
    }
  } catch (error) {
    console.error(`Supabase persist failed for ${table}:`, error);
  }
}

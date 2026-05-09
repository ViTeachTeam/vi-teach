import type { ClassAnalysis, LumiAnalysis } from '../types/score';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function persistAnalysis(analysis: ClassAnalysis, lumi: LumiAnalysis) {
  if (!url || !serviceKey) return;

  await fetch(`${url}/rest/v1/analyses`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      workspace_id: 'demo',
      class_name: analysis.className,
      computed_analysis: analysis,
      lumi_analysis: lumi
    })
  }).catch(() => undefined);
}

export async function persistChat(className: string, question: string, answer: string) {
  if (!url || !serviceKey) return;

  await fetch(`${url}/rest/v1/chat_messages`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      workspace_id: 'demo',
      class_name: className,
      role: 'teacher',
      content: question,
      assistant_content: answer
    })
  }).catch(() => undefined);
}

function headers() {
  return {
    apikey: serviceKey ?? '',
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal'
  };
}

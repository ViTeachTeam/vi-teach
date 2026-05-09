import { NextResponse } from 'next/server';
import type { ClassAnalysis } from '../../../src/types/score';
import { generateLumiChat } from '../../../src/lib/lumi';
import { persistChat } from '../../../src/lib/supabaseRest';

const MAX_QUESTION_LENGTH = 500;
const MAX_ANALYSIS_BYTES = 200_000;
const MAX_WORKSPACE_ID_LENGTH = 64;

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const question = validateQuestion(body.question);
    const analysis = validateAnalysis(body.analysis);
    const workspaceId = validateWorkspaceId(body.workspaceId);

    if (!question || !analysis || workspaceId === null) {
      return NextResponse.json({ error: 'Thiếu câu hỏi hoặc bối cảnh lớp học.' }, { status: 400 });
    }

    const answer = await generateLumiChat(question, analysis);
    await persistChat(analysis.className, question, answer, workspaceId || 'demo');

    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json({ error: 'Lumi chưa thể phản hồi lúc này.' }, { status: 500 });
  }
}

async function readJsonBody(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== 'object') return {} as Record<string, unknown>;
    return body as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

function validateQuestion(value: unknown) {
  if (typeof value !== 'string') return '';
  const question = value.trim();
  if (!question || question.length > MAX_QUESTION_LENGTH) return '';
  return question;
}

function validateAnalysis(value: unknown): ClassAnalysis | null {
  if (!value || typeof value !== 'object') return null;
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > MAX_ANALYSIS_BYTES) return null;

  const maybe = value as Record<string, unknown>;
  const className = maybe.className;
  const riskCounts = maybe.riskCounts;
  const issues = maybe.issues;
  const students = maybe.students;

  if (typeof className !== 'string' || !className.trim()) return null;
  if (!isRiskCounts(riskCounts)) return null;
  if (!Array.isArray(issues) || !Array.isArray(students)) return null;

  return value as ClassAnalysis;
}

function isRiskCounts(value: unknown) {
  if (!value || typeof value !== 'object') return false;
  const counts = value as Record<string, unknown>;
  return isNonNegativeNumber(counts.high) && isNonNegativeNumber(counts.medium) && isNonNegativeNumber(counts.low);
}

function isNonNegativeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function validateWorkspaceId(value: unknown) {
  if (value === undefined) return '';
  if (typeof value !== 'string') return null;
  const workspaceId = value.trim();
  if (!workspaceId) return '';
  if (workspaceId.length > MAX_WORKSPACE_ID_LENGTH) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(workspaceId)) return null;
  return workspaceId;
}

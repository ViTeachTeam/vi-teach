import { NextResponse } from 'next/server';
import type { ClassAnalysis } from '../../../src/types/score';
import { generateLumiChat } from '../../../src/lib/lumi';
import { checkRateLimit, getRateLimitHeaders } from '../../../src/lib/rateLimit';
import { persistApiAudit, persistChat } from '../../../src/lib/supabaseRest';

const MAX_QUESTION_LENGTH = 500;
const MAX_ANALYSIS_BYTES = 200_000;
const MAX_WORKSPACE_ID_LENGTH = 64;
const CHAT_RATE_LIMIT = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;
const ENDPOINT = '/api/chat';

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || undefined;
  let workspaceForAudit = 'demo';
  try {
    const body = await readJsonBody(request);
    const workspaceId = validateWorkspaceId(body.workspaceId);
    if (workspaceId === null) {
      return createResponse({
        status: 400,
        body: { error: 'Workspace ID không hợp lệ.' },
        requestId,
        workspaceId: workspaceForAudit,
        startedAt,
        endpoint: ENDPOINT,
        ipAddress,
        userAgent,
        errorMessage: 'invalid_workspace_id'
      });
    }
    workspaceForAudit = workspaceId || 'demo';

    const rate = checkRateLimit({
      key: `${ENDPOINT}:${workspaceForAudit}`,
      limit: CHAT_RATE_LIMIT,
      windowMs: RATE_LIMIT_WINDOW_MS
    });
    if (!rate.allowed) {
      return createResponse({
        status: 429,
        body: { error: 'Yêu cầu quá nhiều. Vui lòng thử lại sau ít giây.' },
        requestId,
        workspaceId: workspaceForAudit,
        startedAt,
        endpoint: ENDPOINT,
        ipAddress,
        userAgent,
        rateHeaders: getRateLimitHeaders(rate),
        rateLimited: true,
        errorMessage: 'rate_limited'
      });
    }

    const question = validateQuestion(body.question);
    const analysis = validateAnalysis(body.analysis);

    if (!question || !analysis) {
      return createResponse({
        status: 400,
        body: { error: 'Thiếu câu hỏi hoặc bối cảnh lớp học.' },
        requestId,
        workspaceId: workspaceForAudit,
        startedAt,
        endpoint: ENDPOINT,
        ipAddress,
        userAgent,
        rateHeaders: getRateLimitHeaders(rate),
        errorMessage: 'missing_question_or_analysis'
      });
    }

    const answer = await generateLumiChat(question, analysis);
    await persistChat(analysis.className, question, answer, workspaceForAudit);

    return createResponse({
      status: 200,
      body: { answer },
      requestId,
      workspaceId: workspaceForAudit,
      startedAt,
      endpoint: ENDPOINT,
      ipAddress,
      userAgent,
      rateHeaders: getRateLimitHeaders(rate)
    });
  } catch (error) {
    return createResponse({
      status: 500,
      body: { error: 'Lumi chưa thể phản hồi lúc này.' },
      requestId,
      workspaceId: workspaceForAudit,
      startedAt,
      endpoint: ENDPOINT,
      ipAddress,
      userAgent,
      errorMessage: error instanceof Error ? error.message : 'chat_failed'
    });
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

async function createResponse(input: {
  status: number;
  body: Record<string, unknown>;
  requestId: string;
  workspaceId: string;
  startedAt: number;
  endpoint: string;
  ipAddress?: string;
  userAgent?: string;
  rateHeaders?: Record<string, string>;
  rateLimited?: boolean;
  errorMessage?: string;
}) {
  await persistApiAudit({
    workspaceId: input.workspaceId,
    endpoint: input.endpoint,
    requestId: input.requestId,
    statusCode: input.status,
    durationMs: Date.now() - input.startedAt,
    rateLimited: Boolean(input.rateLimited),
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    errorMessage: input.errorMessage
  });

  return NextResponse.json(input.body, {
    status: input.status,
    headers: {
      'x-request-id': input.requestId,
      ...(input.rateHeaders || {})
    }
  });
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') || undefined;
}

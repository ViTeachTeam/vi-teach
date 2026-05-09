import { NextResponse } from 'next/server';
import { generateLumiChat } from '../../../src/lib/lumi';
import { checkRateLimit, getRateLimitHeaders } from '../../../src/lib/rateLimit';
import { readJsonBody, validateAnalysisContext, validateLanguage, validateQuestion, validateWorkspaceId } from '../../../src/lib/requestValidation';
import { persistApiAudit, persistChat } from '../../../src/lib/supabaseRest';
import type { Language } from '../../../src/types/score';

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
  let language: Language = 'vi';
  let workspaceForAudit = 'demo';
  try {
    const body = await readJsonBody(request);
    const nextLanguage = validateLanguage(body.language);
    if (!nextLanguage) {
      return createResponse({
        status: 400,
        body: { error: 'Invalid language. Use vi or en.' },
        requestId,
        workspaceId: workspaceForAudit,
        startedAt,
        endpoint: ENDPOINT,
        ipAddress,
        userAgent,
        errorMessage: 'invalid_language'
      });
    }
    language = nextLanguage;

    const workspaceId = validateWorkspaceId(body.workspaceId, MAX_WORKSPACE_ID_LENGTH);
    if (workspaceId === null) {
      return createResponse({
        status: 400,
        body: { error: language === 'en' ? 'Invalid workspace ID.' : 'Workspace ID không hợp lệ.' },
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
        body: { error: language === 'en' ? 'Too many requests. Please try again shortly.' : 'Yêu cầu quá nhiều. Vui lòng thử lại sau ít giây.' },
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

    const question = validateQuestion(body.question, MAX_QUESTION_LENGTH);
    const analysis = validateAnalysisContext(body.analysis, MAX_ANALYSIS_BYTES);

    if (!question || !analysis) {
      return createResponse({
        status: 400,
        body: { error: language === 'en' ? 'Missing question or class context.' : 'Thiếu câu hỏi hoặc bối cảnh lớp học.' },
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

    const answer = await generateLumiChat(question, analysis, language);
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
      body: { error: language === 'en' ? 'Lumi is unavailable right now.' : 'Lumi chưa thể phản hồi lúc này.' },
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

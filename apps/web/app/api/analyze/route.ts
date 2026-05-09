import { NextResponse } from 'next/server';
import { analyzeClass } from '../../../src/lib/analysis';
import { parseCsv } from '../../../src/lib/csv';
import { generateLumiAnalysis } from '../../../src/lib/lumi';
import { checkRateLimit, getRateLimitHeaders } from '../../../src/lib/rateLimit';
import { persistAnalysis, persistApiAudit } from '../../../src/lib/supabaseRest';

const MAX_CSV_BYTES = 1_000_000;
const MAX_CLASS_NAME_LENGTH = 80;
const MAX_WORKSPACE_ID_LENGTH = 64;
const ANALYZE_RATE_LIMIT = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
const ENDPOINT = '/api/analyze';

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
      limit: ANALYZE_RATE_LIMIT,
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

    const csv = typeof body.csv === 'string' ? body.csv.trim() : '';
    if (!csv) {
      return createResponse({
        status: 400,
        body: { error: 'Thiếu dữ liệu CSV.' },
        requestId,
        workspaceId: workspaceForAudit,
        startedAt,
        endpoint: ENDPOINT,
        ipAddress,
        userAgent,
        rateHeaders: getRateLimitHeaders(rate),
        errorMessage: 'missing_csv'
      });
    }

    if (Buffer.byteLength(csv, 'utf8') > MAX_CSV_BYTES) {
      return createResponse({
        status: 413,
        body: { error: 'CSV quá lớn. Vui lòng tải tệp nhỏ hơn 1MB.' },
        requestId,
        workspaceId: workspaceForAudit,
        startedAt,
        endpoint: ENDPOINT,
        ipAddress,
        userAgent,
        rateHeaders: getRateLimitHeaders(rate),
        errorMessage: 'csv_too_large'
      });
    }

    const className = validateClassName(body.className);
    if (className === null) {
      return createResponse({
        status: 400,
        body: { error: 'Tên lớp không hợp lệ.' },
        requestId,
        workspaceId: workspaceForAudit,
        startedAt,
        endpoint: ENDPOINT,
        ipAddress,
        userAgent,
        rateHeaders: getRateLimitHeaders(rate),
        errorMessage: 'invalid_class_name'
      });
    }

    const students = parseCsv(csv);
    const analysis = analyzeClass(students, className || '10A1');
    const lumi = await generateLumiAnalysis(analysis);
    await persistAnalysis(analysis, lumi, workspaceForAudit);

    return createResponse({
      status: 200,
      body: { analysis, lumi },
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
      status: 400,
      body: { error: error instanceof Error ? error.message : 'Không thể phân tích dữ liệu.' },
      requestId,
      workspaceId: workspaceForAudit,
      startedAt,
      endpoint: ENDPOINT,
      ipAddress,
      userAgent,
      errorMessage: error instanceof Error ? error.message : 'analyze_failed'
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

function validateClassName(value: unknown) {
  if (value === undefined) return '';
  if (typeof value !== 'string') return null;
  const className = value.trim();
  if (!className) return '';
  if (className.length > MAX_CLASS_NAME_LENGTH) return null;
  return className;
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

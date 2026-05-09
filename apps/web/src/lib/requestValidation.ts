import type { ClassAnalysis } from '../types/score';

export async function readJsonBody(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== 'object') return {} as Record<string, unknown>;
    return body as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

export function validateWorkspaceId(value: unknown, maxLength = 64) {
  if (value === undefined) return '';
  if (typeof value !== 'string') return null;
  const workspaceId = value.trim();
  if (!workspaceId) return '';
  if (workspaceId.length > maxLength) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(workspaceId)) return null;
  return workspaceId;
}

export function validateClassName(value: unknown, maxLength = 80) {
  if (value === undefined) return '';
  if (typeof value !== 'string') return null;
  const className = value.trim();
  if (!className) return '';
  if (className.length > maxLength) return null;
  return className;
}

export function validateQuestion(value: unknown, maxLength = 500) {
  if (typeof value !== 'string') return '';
  const question = value.trim();
  if (!question || question.length > maxLength) return '';
  return question;
}

export function validateAnalysisContext(value: unknown, maxBytes = 200_000): ClassAnalysis | null {
  if (!value || typeof value !== 'object') return null;
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > maxBytes) return null;

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

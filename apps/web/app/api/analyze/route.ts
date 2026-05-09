import { NextResponse } from 'next/server';
import { analyzeClass } from '../../../src/lib/analysis';
import { parseCsv } from '../../../src/lib/csv';
import { generateLumiAnalysis } from '../../../src/lib/lumi';
import { persistAnalysis } from '../../../src/lib/supabaseRest';

const MAX_CSV_BYTES = 1_000_000;
const MAX_CLASS_NAME_LENGTH = 80;

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const csv = typeof body.csv === 'string' ? body.csv.trim() : '';
    if (!csv) {
      return NextResponse.json({ error: 'Thiếu dữ liệu CSV.' }, { status: 400 });
    }

    if (Buffer.byteLength(csv, 'utf8') > MAX_CSV_BYTES) {
      return NextResponse.json({ error: 'CSV quá lớn. Vui lòng tải tệp nhỏ hơn 1MB.' }, { status: 413 });
    }

    const className = validateClassName(body.className);
    if (className === null) {
      return NextResponse.json({ error: 'Tên lớp không hợp lệ.' }, { status: 400 });
    }

    const students = parseCsv(csv);
    const analysis = analyzeClass(students, className || '10A1');
    const lumi = await generateLumiAnalysis(analysis);
    await persistAnalysis(analysis, lumi);

    return NextResponse.json({ analysis, lumi });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Không thể phân tích dữ liệu.' },
      { status: 400 }
    );
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

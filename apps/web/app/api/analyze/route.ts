import { NextResponse } from 'next/server';
import { analyzeClass } from '../../../src/lib/analysis';
import { parseCsv } from '../../../src/lib/csv';
import { generateLumiAnalysis } from '../../../src/lib/lumi';
import { persistAnalysis } from '../../../src/lib/supabaseRest';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { csv?: string; className?: string };
    if (!body.csv) {
      return NextResponse.json({ error: 'Thiếu dữ liệu CSV.' }, { status: 400 });
    }

    const students = parseCsv(body.csv);
    const analysis = analyzeClass(students, body.className || '10A1');
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

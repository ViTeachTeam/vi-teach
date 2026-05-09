import { NextResponse } from 'next/server';
import type { ClassAnalysis } from '../../../src/types/score';
import { generateLumiChat } from '../../../src/lib/lumi';
import { persistChat } from '../../../src/lib/supabaseRest';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { question?: string; analysis?: ClassAnalysis };
    if (!body.question?.trim() || !body.analysis) {
      return NextResponse.json({ error: 'Thiếu câu hỏi hoặc bối cảnh lớp học.' }, { status: 400 });
    }

    const answer = await generateLumiChat(body.question.trim(), body.analysis);
    await persistChat(body.analysis.className, body.question.trim(), answer);

    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json({ error: 'Lumi chưa thể phản hồi lúc này.' }, { status: 500 });
  }
}

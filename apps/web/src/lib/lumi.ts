import type { ClassAnalysis, LumiAnalysis } from '../types/score';

export function fallbackLumiAnalysis(analysis: ClassAnalysis): LumiAnalysis {
  const topIssues = analysis.issues.map((issue) => `${issue.label}: ${issue.count} học sinh`);
  const highRisk = analysis.students.filter((student) => student.riskLevel === 'high').slice(0, 3);

  return {
    overview: analysis.overview,
    commonIssues: topIssues.length ? topIssues : ['Dữ liệu chưa đủ để xác định vấn đề nổi bật.'],
    teachingSuggestions: analysis.suggestions,
    meetingSuggestions: highRisk.map((student) => `Gặp ${student.student.name} để rà soát ${student.issue.toLowerCase()}.`),
    strengths: analysis.students
      .filter((student) => student.average >= 8)
      .slice(0, 3)
      .map((student) => `${student.student.name} duy trì điểm trung bình ${student.average}.`)
  };
}

export async function generateLumiAnalysis(analysis: ClassAnalysis): Promise<LumiAnalysis> {
  if (!process.env.OPENAI_API_KEY) return fallbackLumiAnalysis(analysis);

  const payload = {
    className: analysis.className,
    totalStudents: analysis.totalStudents,
    riskCounts: analysis.riskCounts,
    issues: analysis.issues,
    studentsNeedingAttention: analysis.students.slice(0, 8).map((student) => ({
      id: student.student.id,
      name: student.student.name,
      average: student.average,
      trend: student.trend,
      riskLevel: student.riskLevel,
      issue: student.issue,
      weakCategories: student.weakCategories
    }))
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Bạn là Lumi, trợ lý AI của ViTeach cho giáo viên Việt Nam. Trả lời bằng tiếng Việt, cụ thể, thận trọng, không phán xét học sinh. Chỉ trả về JSON hợp lệ với các key: overview, commonIssues, teachingSuggestions, meetingSuggestions, strengths. Mỗi key ngoài overview là mảng chuỗi.'
        },
        {
          role: 'user',
          content: `Phân tích dữ liệu lớp học sau và đề xuất hỗ trợ sư phạm:\n${JSON.stringify(payload)}`
        }
      ]
    })
  });

  if (!response.ok) return fallbackLumiAnalysis(analysis);

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return fallbackLumiAnalysis(analysis);

  try {
    return JSON.parse(content) as LumiAnalysis;
  } catch {
    return fallbackLumiAnalysis(analysis);
  }
}

export async function generateLumiChat(question: string, analysis: ClassAnalysis) {
  if (!process.env.OPENAI_API_KEY) {
    return `Lumi gợi ý: với câu hỏi "${question}", cô nên ưu tiên nhóm ${analysis.riskCounts.high} học sinh nguy cơ cao, xem lại các vấn đề nổi bật như ${analysis.issues.map((issue) => issue.label).join(', ') || 'chưa đủ dữ liệu'}, rồi đặt một hoạt động kiểm tra ngắn sau 2 tuần.`;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: 'Bạn là Lumi của ViTeach. Trả lời tiếng Việt, ngắn gọn, có hành động cụ thể cho giáo viên, không nêu chẩn đoán nhạy cảm.'
        },
        {
          role: 'user',
          content: `Bối cảnh lớp: ${JSON.stringify({
            className: analysis.className,
            totalStudents: analysis.totalStudents,
            riskCounts: analysis.riskCounts,
            issues: analysis.issues,
            focusStudents: analysis.students.slice(0, 6).map((student) => ({
              name: student.student.name,
              average: student.average,
              risk: student.riskLevel,
              issue: student.issue
            }))
          })}\n\nCâu hỏi của giáo viên: ${question}`
        }
      ]
    })
  });

  if (!response.ok) {
    return fallbackLumiAnalysis(analysis).teachingSuggestions.join(' ');
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? fallbackLumiAnalysis(analysis).overview;
}

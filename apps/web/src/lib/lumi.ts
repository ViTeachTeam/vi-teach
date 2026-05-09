import type { ClassAnalysis, Language, LumiAnalysis } from '../types/score';

export function fallbackLumiAnalysis(analysis: ClassAnalysis, language: Language = 'vi'): LumiAnalysis {
  const topIssues = analysis.issues.map((issue) => `${translateIssue(issue.label, language)}: ${issue.count} ${language === 'en' ? 'students' : 'học sinh'}`);
  const highRisk = analysis.students.filter((student) => student.riskLevel === 'high').slice(0, 3);

  const lowDataMessage = language === 'en'
    ? 'Not enough data to identify common issues.'
    : 'Dữ liệu chưa đủ để xác định vấn đề nổi bật.';

  return {
    overview: translateOverview(analysis.overview, language),
    commonIssues: topIssues.length ? topIssues : [lowDataMessage],
    teachingSuggestions: analysis.suggestions.map((item) => translateSuggestion(item, language)),
    meetingSuggestions: highRisk.map((student) =>
      language === 'en'
        ? `Meet ${student.student.name} to review ${translateIssue(student.issue.toLowerCase(), language)}.`
        : `Gặp ${student.student.name} để rà soát ${student.issue.toLowerCase()}.`
    ),
    strengths: analysis.students
      .filter((student) => student.average >= 8)
      .slice(0, 3)
      .map((student) =>
        language === 'en'
          ? `${student.student.name} maintains an average score of ${student.average}.`
          : `${student.student.name} duy trì điểm trung bình ${student.average}.`
      )
  };
}

export async function generateLumiAnalysis(analysis: ClassAnalysis, language: Language = 'vi'): Promise<LumiAnalysis> {
  if (!process.env.OPENAI_API_KEY) return fallbackLumiAnalysis(analysis, language);

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
          content: language === 'en'
            ? 'You are Lumi, ViTeach AI assistant for teachers. Reply in clear English, practical and careful, never judgmental toward students. Return valid JSON with keys: overview, commonIssues, teachingSuggestions, meetingSuggestions, strengths. All keys except overview must be arrays of strings.'
            : 'Bạn là Lumi, trợ lý AI của ViTeach cho giáo viên Việt Nam. Trả lời bằng tiếng Việt, cụ thể, thận trọng, không phán xét học sinh. Chỉ trả về JSON hợp lệ với các key: overview, commonIssues, teachingSuggestions, meetingSuggestions, strengths. Mỗi key ngoài overview là mảng chuỗi.'
        },
        {
          role: 'user',
          content: language === 'en'
            ? `Analyze this classroom dataset and provide practical teaching support recommendations:\n${JSON.stringify(payload)}`
            : `Phân tích dữ liệu lớp học sau và đề xuất hỗ trợ sư phạm:\n${JSON.stringify(payload)}`
        }
      ]
    })
  });

  if (!response.ok) return fallbackLumiAnalysis(analysis, language);

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return fallbackLumiAnalysis(analysis, language);

  try {
    return JSON.parse(content) as LumiAnalysis;
  } catch {
    return fallbackLumiAnalysis(analysis, language);
  }
}

export async function generateLumiChat(question: string, analysis: ClassAnalysis, language: Language = 'vi') {
  if (!process.env.OPENAI_API_KEY) {
    return language === 'en'
      ? `Lumi suggests: for your question "${question}", prioritize the ${analysis.riskCounts.high} high-risk students, review common issues such as ${analysis.issues.map((issue) => translateIssue(issue.label, language)).join(', ') || 'insufficient data'}, and run a short check-in activity in two weeks.`
      : `Lumi gợi ý: với câu hỏi "${question}", cô nên ưu tiên nhóm ${analysis.riskCounts.high} học sinh nguy cơ cao, xem lại các vấn đề nổi bật như ${analysis.issues.map((issue) => issue.label).join(', ') || 'chưa đủ dữ liệu'}, rồi đặt một hoạt động kiểm tra ngắn sau 2 tuần.`;
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
          content: language === 'en'
            ? 'You are Lumi from ViTeach. Reply in concise English with actionable teacher guidance and avoid sensitive diagnosis.'
            : 'Bạn là Lumi của ViTeach. Trả lời tiếng Việt, ngắn gọn, có hành động cụ thể cho giáo viên, không nêu chẩn đoán nhạy cảm.'
        },
        {
          role: 'user',
          content: `${language === 'en' ? 'Class context' : 'Bối cảnh lớp'}: ${JSON.stringify({
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
          })}\n\n${language === 'en' ? 'Teacher question' : 'Câu hỏi của giáo viên'}: ${question}`
        }
      ]
    })
  });

  if (!response.ok) {
    return fallbackLumiAnalysis(analysis, language).teachingSuggestions.join(' ');
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? fallbackLumiAnalysis(analysis, language).overview;
}

function translateOverview(overview: string, language: Language) {
  if (language === 'vi') return overview;
  return overview
    .replace('Lớp có', 'The class has')
    .replace('học sinh,', 'students,')
    .replace('em cần hỗ trợ sớm', 'students need early support')
    .replace('em cần theo dõi', 'students need monitoring')
    .replace('Trọng tâm nên là củng cố nền tảng, giảm thiếu bài tập và can thiệp cá nhân cho nhóm có xu hướng điểm giảm.', 'Focus on strengthening foundations, reducing missing homework, and providing targeted intervention for students with declining trends.');
}

function translateSuggestion(text: string, language: Language) {
  if (language === 'vi') return text;
  const map: Record<string, string> = {
    'Tổ chức buổi ôn tập nền tảng cho nhóm học sinh nguy cơ cao.': 'Run a foundation review session for the high-risk group.',
    'Ghép học sinh khá với nhóm trung bình để hỗ trợ theo cặp.': 'Pair stronger students with medium-risk students for peer support.',
    'Theo dõi tiến bộ sau 2 tuần bằng một bài kiểm tra ngắn.': 'Track progress after two weeks using a short check-in quiz.',
    'Gửi nhắc nhở bài tập cá nhân hóa cho nhóm thiếu bài nhiều lần.': 'Send personalized homework reminders to students with repeated missing work.'
  };
  return map[text] || text;
}

function translateIssue(text: string, language: Language) {
  if (language === 'vi') return text;
  const map: Record<string, string> = {
    'Điểm số giảm dần': 'Declining score trend',
    'Thiếu bài tập về nhà': 'Missing homework',
    'Vắng nhiều': 'Frequent absences',
    'Nền tảng kiến thức yếu': 'Weak knowledge foundation',
    'Ít tham gia phát biểu': 'Low class participation',
    'Đang tiến bộ ổn định': 'Stable positive progress',
    'mieng': 'oral score',
    '15p': '15-minute quiz',
    'thuc hanh': 'practice',
    'du an': 'project',
    'giua ky': 'midterm',
    'hien tai': 'current score',
    'hoat dong lop': 'class activity'
  };
  return map[text] || text;
}

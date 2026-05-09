import type { ClassAnalysis, Language, RiskLevel, StudentAnalysis, StudentScore } from '../types/score';

const scoreFields: { key: keyof StudentScore; label: string; phase: number }[] = [
  { key: 'oralScore', label: 'Miệng', phase: 1 },
  { key: 'score15m', label: '15p', phase: 2 },
  { key: 'practice', label: 'Thực hành', phase: 3 },
  { key: 'project', label: 'Dự án', phase: 4 },
  { key: 'midterm', label: 'Giữa kỳ', phase: 5 },
  { key: 'final', label: 'Hiện tại', phase: 6 },
  { key: 'classActivity', label: 'Hoạt động lớp', phase: 7 }
];

export function analyzeClass(students: StudentScore[], className = '10A1'): ClassAnalysis {
  const { teacherName, subject } = extractClassMetadata(students);
  const analyzed = students.map(analyzeStudent).sort((a, b) => riskWeight(b.riskLevel) - riskWeight(a.riskLevel) || a.average - b.average);
  const riskCounts = {
    high: analyzed.filter((student) => student.riskLevel === 'high').length,
    medium: analyzed.filter((student) => student.riskLevel === 'medium').length,
    low: analyzed.filter((student) => student.riskLevel === 'low').length
  };
  const totalStudents = analyzed.length || 1;
  const issueMap = new Map<string, number>();
  analyzed.forEach((student) => {
    issueMap.set(student.issue, (issueMap.get(student.issue) ?? 0) + 1);
    student.weakCategories.forEach((category) => issueMap.set(category, (issueMap.get(category) ?? 0) + 1));
  });

  const issues = [...issueMap.entries()]
    .map(([label, count]) => ({ label, count, percent: Math.round((count / totalStudents) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  return {
    className: students[0]?.className || className,
    teacherName,
    subject,
    students: analyzed,
    totalStudents: analyzed.length,
    attentionCount: riskCounts.high + riskCounts.medium,
    riskCounts,
    riskDistribution: [
      { label: 'Nguy cơ cao', value: riskCounts.high, color: '#ff4d5f', level: 'high' },
      { label: 'Nguy cơ trung bình', value: riskCounts.medium, color: '#f59e0b', level: 'medium' },
      { label: 'Nguy cơ thấp', value: riskCounts.low, color: '#35c987', level: 'low' }
    ],
    issues,
    suggestions: buildSuggestions(riskCounts, issues),
    overview: `Lớp có ${analyzed.length} học sinh, ${riskCounts.high} em cần hỗ trợ sớm và ${riskCounts.medium} em cần theo dõi. Trọng tâm nên là củng cố nền tảng, giảm thiếu bài tập và can thiệp cá nhân cho nhóm có xu hướng điểm giảm.`,
    generatedAt: new Date().toISOString()
  };
}

export function analyzeStudent(student: StudentScore): StudentAnalysis {
  const points = scoreFields
    .map((field) => ({ label: field.label, value: student[field.key], phase: field.phase }))
    .filter((point): point is { label: string; value: number; phase: number } => typeof point.value === 'number')
    .sort((a, b) => a.phase - b.phase);

  const adjusted = points.map((point) => point.value);
  const average = round(clamp(mean(adjusted) + (student.bonus ?? 0) - (student.penalty ?? 0), 0, 10));
  const trend = points.length >= 2 ? round(points[points.length - 1].value - points[0].value) : 0;
  const volatility = round(standardDeviation(adjusted));
  const weakCategories = points.filter((point) => point.value < 6).map((point) => point.label);
  if ((student.homeworkMissing ?? 0) >= 3) weakCategories.push('Thiếu bài tập về nhà');
  if ((student.participation ?? 10) < 5.5) weakCategories.push('Ít tham gia phát biểu');
  if ((student.attendance ?? 100) < 85) weakCategories.push('Vắng nhiều');

  const riskLevel = getRiskLevel(average, trend, volatility, weakCategories.length);
  const strengths = points.filter((point) => point.value >= 8).map((point) => point.label).slice(0, 3);

  return {
    student,
    average,
    trend,
    volatility,
    riskLevel,
    weakCategories,
    strengths,
    issue: getPrimaryIssue(average, trend, weakCategories),
    trendPoints: points.map(({ label, value }) => ({ label, value: round(value) }))
  };
}

export function riskLabel(level: RiskLevel, language: Language = 'vi') {
  if (language === 'en') {
    return level === 'high' ? 'High Risk' : level === 'medium' ? 'Medium Risk' : 'Low Risk';
  }
  return level === 'high' ? 'Nguy cơ cao' : level === 'medium' ? 'Nguy cơ trung bình' : 'Nguy cơ thấp';
}

function getRiskLevel(average: number, trend: number, volatility: number, weakCount: number): RiskLevel {
  if (average < 5 || trend <= -2 || weakCount >= 4) return 'high';
  if (average < 6.5 || trend <= -1 || volatility > 1.5 || weakCount >= 2) return 'medium';
  return 'low';
}

function getPrimaryIssue(average: number, trend: number, weakCategories: string[]) {
  if (trend <= -1.5) return 'Điểm số giảm dần';
  if (weakCategories.includes('Thiếu bài tập về nhà')) return 'Thiếu bài tập về nhà';
  if (weakCategories.includes('Vắng nhiều')) return 'Vắng nhiều';
  if (average < 6) return 'Nền tảng kiến thức yếu';
  if (weakCategories.includes('Ít tham gia phát biểu')) return 'Ít tham gia phát biểu';
  return 'Đang tiến bộ ổn định';
}

function buildSuggestions(riskCounts: Record<RiskLevel, number>, issues: { label: string; count: number }[]) {
  const suggestions = ['Tổ chức buổi ôn tập nền tảng cho nhóm học sinh nguy cơ cao.', 'Ghép học sinh khá với nhóm trung bình để hỗ trợ theo cặp.', 'Theo dõi tiến bộ sau 2 tuần bằng một bài kiểm tra ngắn.'];
  if (riskCounts.high > 0) suggestions.unshift(`Đặt lịch gặp 1:1 với ${riskCounts.high} học sinh nguy cơ cao trong tuần này.`);
  if (issues.some((issue) => issue.label.includes('Thiếu bài'))) suggestions.push('Gửi nhắc nhở bài tập cá nhân hóa cho nhóm thiếu bài nhiều lần.');
  return suggestions.slice(0, 4);
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function standardDeviation(values: number[]) {
  const avg = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - avg) ** 2)));
}

function riskWeight(level: RiskLevel) {
  return level === 'high' ? 3 : level === 'medium' ? 2 : 1;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function extractClassMetadata(students: StudentScore[]) {
  const firstWithTeacher = students.find((student) => student.teacherName?.trim())?.teacherName?.trim();
  const firstWithSubject = students.find((student) => student.subject?.trim())?.subject?.trim();

  return {
    teacherName: firstWithTeacher || 'Giáo viên',
    subject: firstWithSubject || 'Chưa cung cấp'
  };
}

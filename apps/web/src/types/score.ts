export type RiskLevel = 'high' | 'medium' | 'low';

export type StudentScore = {
  id: string;
  name: string;
  gender?: string;
  className?: string;
  oralScore?: number;
  score15m?: number;
  bonus?: number;
  penalty?: number;
  midterm?: number;
  final?: number;
  practice?: number;
  project?: number;
  classActivity?: number;
  attendance?: number;
  homeworkMissing?: number;
  participation?: number;
};

export type StudentAnalysis = {
  student: StudentScore;
  average: number;
  trend: number;
  volatility: number;
  riskLevel: RiskLevel;
  weakCategories: string[];
  strengths: string[];
  issue: string;
  trendPoints: { label: string; value: number }[];
};

export type ClassAnalysis = {
  className: string;
  students: StudentAnalysis[];
  totalStudents: number;
  attentionCount: number;
  riskCounts: Record<RiskLevel, number>;
  riskDistribution: { label: string; value: number; color: string; level: RiskLevel }[];
  issues: { label: string; count: number; percent: number }[];
  suggestions: string[];
  overview: string;
  generatedAt: string;
};

export type LumiAnalysis = {
  overview: string;
  commonIssues: string[];
  teachingSuggestions: string[];
  meetingSuggestions: string[];
  strengths: string[];
};

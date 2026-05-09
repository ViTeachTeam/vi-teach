'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertCircle,
  BarChart3,
  Brain,
  CalendarCheck,
  CheckCircle2,
  FileText,
  FileUp,
  GraduationCap,
  LayoutDashboard,
  MessageCircle,
  Send,
  Settings,
  Upload,
  X,
  Users
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { analyzeClass, riskLabel } from '../lib/analysis';
import { parseCsv } from '../lib/csv';
import { fallbackLumiAnalysis } from '../lib/lumi';
import { sampleCsv } from '../data/sampleCsv';
import type { ClassAnalysis, Language, LumiAnalysis, RiskLevel, StudentAnalysis } from '../types/score';

type ChatMessage = {
  role: 'teacher' | 'lumi';
  content: string;
};

type AnalyzePopupState = {
  open: boolean;
  status: 'analyzing' | 'success' | 'error';
  title: string;
  detail: string;
};

type SavedClassState = {
  id: string;
  className: string;
  subject: string;
  analysis: ClassAnalysis;
  lumi: LumiAnalysis;
  csv: string;
  updatedAt: number;
};

type DashboardProps = {
  workspaceIdOverride?: string;
  teacherNameOverride?: string;
  teacherEmail?: string;
  onSignOut?: () => void | Promise<void>;
};

const initialAnalysis = analyzeClass(parseCsv(sampleCsv));
const initialLumi = fallbackLumiAnalysis(initialAnalysis);
const initialClassId = buildClassId(initialAnalysis.className, initialAnalysis.subject);

export function Dashboard({ workspaceIdOverride, teacherNameOverride, teacherEmail, onSignOut }: DashboardProps) {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'vi';
    const existing = window.localStorage.getItem('viteach_lang');
    return existing === 'en' ? 'en' : 'vi';
  });
  const [expandedTeacher, setExpandedTeacher] = useState(false);
  const [workspaceId] = useState(() => {
    if (typeof window === 'undefined') return 'demo';
    const storageKey = 'viteach_workspace_id';
    if (workspaceIdOverride) {
      window.localStorage.setItem(storageKey, workspaceIdOverride);
      return workspaceIdOverride;
    }
    const existing = window.localStorage.getItem(storageKey);
    if (existing) return existing;
    const next = `ws_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(storageKey, next);
    return next;
  });
  const [csv, setCsv] = useState(sampleCsv);
  const [analysis, setAnalysis] = useState<ClassAnalysis>(initialAnalysis);
  const [lumi, setLumi] = useState<LumiAnalysis>(initialLumi);
  const [selectedAttentionId, setSelectedAttentionId] = useState(initialAnalysis.students[0]?.student.id);
  const [selectedPotentialId, setSelectedPotentialId] = useState<string | undefined>(undefined);
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [savedClasses, setSavedClasses] = useState<SavedClassState[]>([
    {
      id: initialClassId,
      className: initialAnalysis.className,
      subject: initialAnalysis.subject || (language === 'en' ? 'Not provided' : 'Chưa cung cấp'),
      analysis: initialAnalysis,
      lumi: initialLumi,
      csv: sampleCsv,
      updatedAt: Date.now()
    }
  ]);
  const [currentClassId, setCurrentClassId] = useState(initialClassId);
  const [isClassPickerOpen, setIsClassPickerOpen] = useState(false);
  const [analyzePopup, setAnalyzePopup] = useState<AnalyzePopupState>({
    open: false,
    status: 'analyzing',
    title: '',
    detail: ''
  });
  const [question, setQuestion] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chat, setChat] = useState<ChatMessage[]>([
    { role: 'lumi', content: language === 'en'
      ? 'You can ask Lumi about priority student groups, review plans, or how to organize 1:1 meetings.'
      : 'Cô có thể hỏi Lumi về nhóm học sinh cần chú ý, kế hoạch ôn tập hoặc cách tổ chức gặp 1:1.' }
  ]);
  const fileInput = useRef<HTMLInputElement>(null);

  const attentionStudents = useMemo(() => getAttentionStudents(analysis), [analysis]);
  const potentialStudents = useMemo(
    () => getPotentialStudents(analysis),
    [analysis]
  );
  const selectedAttention = useMemo(
    () => attentionStudents.find((student) => student.student.id === selectedAttentionId) || attentionStudents[0],
    [attentionStudents, selectedAttentionId]
  );
  const selectedPotential = useMemo(
    () => potentialStudents.find((student) => student.student.id === selectedPotentialId) || potentialStudents[0],
    [potentialStudents, selectedPotentialId]
  );
  const classStorageKey = `viteach_saved_classes_${workspaceId}`;
  const teacherDisplayName = teacherNameOverride || analysis.teacherName || (language === 'en' ? 'Teacher' : 'Giáo viên');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(classStorageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as SavedClassState[];
      if (!Array.isArray(parsed) || parsed.length === 0) return;
      setSavedClasses(parsed);
      setCurrentClassId(parsed[0].id);
      setAnalysis(parsed[0].analysis);
      setLumi(parsed[0].lumi);
      setCsv(parsed[0].csv);
      syncSelectedStudents(parsed[0].analysis);
    } catch {
      // Ignore invalid local storage payload.
    }
  }, [classStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(classStorageKey, JSON.stringify(savedClasses));
  }, [classStorageKey, savedClasses]);

  useEffect(() => {
    setLumi((current) => {
      if (current === initialLumi) {
        return fallbackLumiAnalysis(analysis, language);
      }
      return current;
    });
    setChat((messages) => {
      if (messages.length !== 1 || messages[0]?.role !== 'lumi') return messages;
      return [
        {
          role: 'lumi',
          content: language === 'en'
            ? 'You can ask Lumi about priority student groups, review plans, or how to organize 1:1 meetings.'
            : 'Cô có thể hỏi Lumi về nhóm học sinh cần chú ý, kế hoạch ôn tập hoặc cách tổ chức gặp 1:1.'
        }
      ];
    });
  }, [analysis, language]);

  async function runAnalysis(nextCsv = csv, showPopup = true) {
    setError('');
    setIsAnalyzing(true);
    if (showPopup) {
      setAnalyzePopup({
        open: true,
        status: 'analyzing',
        title: language === 'en' ? 'Analyzing your class data' : 'Đang phân tích dữ liệu lớp',
        detail: language === 'en'
          ? 'Lumi is reading scores, grouping risks, and building teaching actions...'
          : 'Lumi đang đọc dữ liệu, phân nhóm rủi ro và tạo gợi ý giảng dạy...'
      });
    }
    try {
      const local = analyzeClass(parseCsv(nextCsv));
      const localLumi = fallbackLumiAnalysis(local, language);
      setAnalysis(local);
      syncSelectedStudents(local);
      setLumi(localLumi);
      upsertClass(local, localLumi, nextCsv);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: nextCsv, className: local.className, workspaceId, language })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (language === 'en' ? 'Unable to analyze data.' : 'Không thể phân tích dữ liệu.'));
      setAnalysis(data.analysis);
      setLumi(data.lumi);
      syncSelectedStudents(data.analysis);
      upsertClass(data.analysis, data.lumi, nextCsv);
      if (showPopup) {
        setAnalyzePopup({
          open: true,
          status: 'success',
          title: language === 'en' ? 'Analysis completed successfully' : 'Phân tích đã hoàn tất',
          detail: language === 'en'
            ? `Dashboard updated for ${data.analysis.className}.`
            : `Dashboard đã cập nhật cho lớp ${data.analysis.className}.`
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : (language === 'en' ? 'Unable to read CSV data.' : 'Không thể đọc dữ liệu CSV.');
      setError(message);
      if (showPopup) {
        setAnalyzePopup({
          open: true,
          status: 'error',
          title: language === 'en' ? 'Analysis failed' : 'Phân tích thất bại',
          detail: message
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleUpload(file: File) {
    const text = await file.text();
    setCsv(text);
    await runAnalysis(text, true);
  }

  function closeAnalyzePopup() {
    setAnalyzePopup((current) => ({ ...current, open: false }));
  }

  function upsertClass(nextAnalysis: ClassAnalysis, nextLumi: LumiAnalysis, nextCsv: string) {
    const id = buildClassId(nextAnalysis.className, nextAnalysis.subject);
    const nextClass: SavedClassState = {
      id,
      className: nextAnalysis.className,
      subject: nextAnalysis.subject || (language === 'en' ? 'Not provided' : 'Chưa cung cấp'),
      analysis: nextAnalysis,
      lumi: nextLumi,
      csv: nextCsv,
      updatedAt: Date.now()
    };

    setSavedClasses((previous) => {
      const rest = previous.filter((item) => item.id !== id);
      return [nextClass, ...rest];
    });
    setCurrentClassId(id);
  }

  function switchClass(classId: string) {
    const target = savedClasses.find((item) => item.id === classId);
    if (!target) return;

    setCurrentClassId(target.id);
    setAnalysis(target.analysis);
    setLumi(target.lumi);
    setCsv(target.csv);
    syncSelectedStudents(target.analysis);
    setError('');
    setIsClassPickerOpen(false);
  }

  function syncSelectedStudents(nextAnalysis: ClassAnalysis) {
    const nextAttention = getAttentionStudents(nextAnalysis)[0]?.student.id;
    const nextPotential = getPotentialStudents(nextAnalysis)[0]?.student.id;
    setSelectedAttentionId(nextAttention);
    setSelectedPotentialId(nextPotential);
  }

  function refreshDashboard() {
    if (typeof window !== 'undefined') window.location.reload();
  }

  async function askLumi() {
    if (!question.trim()) return;
    const nextQuestion = question.trim();
    setQuestion('');
    setChat((messages) => [...messages, { role: 'teacher', content: nextQuestion }]);
    setIsChatting(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: nextQuestion, analysis, workspaceId, language })
      });
      const data = await response.json();
      setChat((messages) => [...messages, { role: 'lumi', content: data.answer || data.error }]);
    } finally {
      setIsChatting(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">V</div>
          <div className="brand-copy">
            <strong>ViTeach</strong>
            <span className="brand-slogan">{language === 'en' ? 'Understand Students - Teach Smarter' : 'Hiểu học sinh - Dạy đúng cách'}</span>
          </div>
        </div>
        <nav className="nav">
          {(language === 'en'
            ? ['Class Overview', 'Students', 'AI Analysis', 'Teaching Plan', 'Import Data', 'Reports', 'Settings']
            : ['Tổng quan lớp', 'Học sinh', 'AI Phân tích', 'Kế hoạch giảng dạy', 'Nhập dữ liệu', 'Báo cáo', 'Cài đặt'])
            .map((item, index) => (
            <Button className={index === 0 ? 'active' : ''} key={item} variant="ghost">
              {navIcon(index)}
              {item}
            </Button>
          ))}
        </nav>
        <Separator />
        <div className="teacher-card-wrapper">
          <Card className="teacher-card">
            <Button
              variant="ghost"
              className="teacher-profile"
              onClick={() => setExpandedTeacher(!expandedTeacher)}
            >
              <Avatar>
                <AvatarFallback>{initials(teacherDisplayName)}</AvatarFallback>
              </Avatar>
              <div className="teacher-info">
                <strong>{teacherDisplayName}</strong>
                <span>{teacherEmail || (language === 'en' ? `Teacher · ${analysis.subject || 'No subject provided'}` : `Giáo viên ${analysis.subject || 'chưa cung cấp môn'}`)}</span>
              </div>
            </Button>
          </Card>
          {expandedTeacher && (
            <div className="teacher-dropdown-menu">
              <div className="menu-item">
                <div className="menu-item-label">{language === 'en' ? 'Language' : 'Ngôn ngữ'}</div>
                <div className="menu-item-content">
                  <Button size="sm" variant={language === 'vi' ? 'default' : 'outline'} onClick={() => { setLanguage('vi'); if (typeof window !== 'undefined') window.localStorage.setItem('viteach_lang', 'vi'); }}>
                    VI
                  </Button>
                  <Button size="sm" variant={language === 'en' ? 'default' : 'outline'} onClick={() => { setLanguage('en'); if (typeof window !== 'undefined') window.localStorage.setItem('viteach_lang', 'en'); }}>
                    EN
                  </Button>
                </div>
              </div>
              {onSignOut && (
                <>
                  <Separator className="my-1" />
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => void onSignOut()}
                  >
                    {language === 'en' ? 'Sign out' : 'Đăng xuất'}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
        <Card className="class-card">
          <span>{language === 'en' ? 'Current Class' : 'Lớp hiện tại'}</span>
          <strong>{analysis.className}</strong>
          <p>{language === 'en' ? `Subject: ${analysis.subject || 'Not provided'}` : `Môn: ${analysis.subject || 'Chưa cung cấp'}`}</p>
          <p>{language === 'en' ? `Class size: ${analysis.totalStudents} students` : `Sĩ số: ${analysis.totalStudents} học sinh`}</p>
          <Button variant="outline" onClick={() => setIsClassPickerOpen(true)}>
            {language === 'en' ? 'Switch Class' : 'Đổi lớp'}
            <span>→</span>
          </Button>
        </Card>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <h1>{language === 'en' ? `Hello ${teacherDisplayName}` : `Xin chào ${teacherDisplayName}`}</h1>
            <p>{language === 'en'
              ? `Track class ${analysis.className}, detect students needing support, and get teaching suggestions from Lumi.`
              : `Theo dõi lớp ${analysis.className}, phát hiện học sinh cần hỗ trợ và nhận gợi ý giảng dạy từ Lumi.`}</p>
          </div>
          <div className="actions">
            <input
              ref={fileInput}
              accept=".csv,text/csv"
              hidden
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
            <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={isAnalyzing}>
              <Upload />
              {isAnalyzing
                ? (language === 'en' ? 'Analyzing...' : 'Đang phân tích...')
                : (language === 'en' ? 'Upload Data' : 'Nhập dữ liệu')}
            </Button>
          </div>
        </header>

        {error ? (
          <Alert variant="destructive" className="error">
            <AlertCircle />
            <AlertTitle>{language === 'en' ? 'Unable to analyze data' : 'Không thể phân tích dữ liệu'}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <section className="kpi-grid">
          <Kpi title={language === 'en' ? 'Total Students' : 'Tổng học sinh'} value={analysis.totalStudents} note={language === 'en' ? 'analyzed' : 'đã phân tích'} accent="violet" icon={<Users />} />
          <Kpi title={language === 'en' ? 'Students Needing Support' : 'Học sinh cần chú ý'} value={analysis.attentionCount} note={language === 'en' ? 'share of class size' : 'tỷ lệ trên sĩ số lớp'} delta={`${percent(analysis.attentionCount, analysis.totalStudents)}%`} accent="amber" icon={<BellIcon />} />
          <Kpi title={language === 'en' ? 'High Risk' : 'Nguy cơ cao'} value={analysis.riskCounts.high} note={language === 'en' ? 'early support needed' : 'cần hỗ trợ sớm'} accent="red" icon={<AlertCircle />} />
          <Kpi title={language === 'en' ? 'Medium Risk' : 'Nguy cơ trung bình'} value={analysis.riskCounts.medium} note={language === 'en' ? 'monitor closely' : 'cần theo dõi'} accent="amber" icon={<BarChart3 />} />
          <Kpi title={language === 'en' ? 'Low Risk' : 'Nguy cơ thấp'} value={analysis.riskCounts.low} note={language === 'en' ? 'stable progress' : 'đang tiến bộ'} accent="green" icon={<CheckCircle2 />} />
          <Kpi
            title={language === 'en' ? 'Potential Students' : 'Học sinh tiềm năng'}
            value={potentialStudents.length}
            note={language === 'en' ? 'ready for enrichment' : 'sẵn sàng bồi dưỡng'}
            delta={`${percent(potentialStudents.length, analysis.totalStudents)}%`}
            accent="violet"
            icon={<GraduationCap />}
          />
        </section>

        <section className="dashboard-grid">
          <Panel title={language === 'en' ? 'Risk Distribution' : 'Phân bố mức độ rủi ro'} className="risk-panel" language={language}>
            <Donut analysis={analysis} language={language} />
          </Panel>
          <Panel title={language === 'en' ? 'Top Class Issues' : 'Vấn đề nổi bật của lớp'} language={language}>
            <div className="issue-list">
              {analysis.issues.map((issue) => (
                <div className="issue-row" key={issue.label}>
                  <span>{translateDynamicText(issue.label, language)}</span>
                  <div><i style={{ width: `${Math.max(issue.percent, 8)}%` }} /></div>
                  <strong>{language === 'en' ? `${issue.count} students` : `${issue.count} học sinh`}</strong>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title={language === 'en' ? 'Action Suggestions from Lumi' : 'Gợi ý hành động từ Lumi'} language={language}>
            <div className="suggestions">
              {lumi.teachingSuggestions.slice(0, 3).map((item) => <p key={item}>{item}</p>)}
            </div>
            <Button className="link-button" variant="link">{language === 'en' ? 'View detailed plan →' : 'Xem kế hoạch chi tiết →'}</Button>
          </Panel>
        </section>

        <section className="potential-grid">
          <Panel title={language === 'en' ? 'Potential Students Spotlight' : 'Học sinh tiềm năng nổi bật'} language={language}>
            {potentialStudents.length === 0 ? (
              <p className="potential-empty">
                {language === 'en'
                  ? 'No potential group identified yet. Upload more recent assessments to surface candidates.'
                  : 'Chưa xác định được nhóm tiềm năng. Hãy tải thêm dữ liệu đánh giá gần đây để phát hiện học sinh nổi bật.'}
              </p>
            ) : (
              <div className="potential-list">
                {potentialStudents.slice(0, 5).map((student) => (
                  <button
                    className={selectedPotential?.student.id === student.student.id ? 'potential-row selected' : 'potential-row'}
                    key={student.student.id}
                    onClick={() => setSelectedPotentialId(student.student.id)}
                  >
                    <span>
                      <b>{student.student.name}</b>
                      <small>{language === 'en' ? 'Avg score' : 'Điểm TB'}: {student.average.toFixed(1)}</small>
                    </span>
                    <span>
                      <b>{language === 'en' ? 'Trend' : 'Xu hướng'}</b>
                      <small>{formatTrend(student.trend, language)}</small>
                    </span>
                    <span>
                      <b>{language === 'en' ? 'Top strengths' : 'Điểm mạnh'}</b>
                      <small>{student.strengths.slice(0, 2).map((item) => translateDynamicText(item, language)).join(', ') || (language === 'en' ? 'Consistent performance' : 'Ổn định qua các giai đoạn')}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Panel>

          {selectedPotential ? (
            <Panel className="potential-detail" title={`${selectedPotential.student.name} · ${language === 'en' ? 'Potential' : 'Tiềm năng'}`} language={language}>
              <div className="student-meta">{language === 'en' ? 'ID' : 'SBD'}: {selectedPotential.student.id} | {selectedPotential.student.gender || 'N/A'} | {analysis.className}</div>
              <div className="detail-stack">
                <div className="chart-card">
                  <TrendChart student={selectedPotential} language={language} />
                </div>
                <div className="insight-grid">
                  <div className="insight-box">
                    <strong>{language === 'en' ? 'Strength Drivers' : 'Năng lực nổi bật'}</strong>
                    <ul className="insight-list">{buildPotentialReasonDetails(selectedPotential, language).map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                  <div className="insight-box">
                    <strong>{language === 'en' ? 'Growth Suggestions' : 'Gợi ý bồi dưỡng'}</strong>
                    <ul className="insight-list">{buildPotentialSuggestions(selectedPotential, language).map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                </div>
              </div>
            </Panel>
          ) : null}
        </section>

        <section className="lower-grid">
          <Panel title={language === 'en' ? 'Students Requiring Attention' : 'Học sinh cần chú ý'} className="student-list-panel" language={language}>
            <div className="table-head">
              <span>{language === 'en' ? 'Student' : 'Học sinh'}</span>
              <span>{language === 'en' ? 'Risk Level' : 'Mức độ rủi ro'}</span>
              <span>{language === 'en' ? 'Main Issue' : 'Vấn đề chính'}</span>
            </div>
            {attentionStudents.slice(0, 6).map((student) => (
              <button
                className={selectedAttention?.student.id === student.student.id ? 'student-row selected' : 'student-row'}
                key={student.student.id}
                onClick={() => setSelectedAttentionId(student.student.id)}
              >
                <span><b>{student.student.name}</b><small>{language === 'en' ? 'ID' : 'SBD'}: {student.student.id}</small></span>
                <RiskPill level={student.riskLevel} language={language} />
                <span>{translateDynamicText(student.issue, language)}</span>
              </button>
            ))}
          </Panel>

          {selectedAttention ? (
            <Panel className="student-detail" title={`${selectedAttention.student.name} · ${riskLabel(selectedAttention.riskLevel, language)}`} language={language}>
              <div className="student-meta">{language === 'en' ? 'ID' : 'SBD'}: {selectedAttention.student.id} | {selectedAttention.student.gender || 'N/A'} | {analysis.className}</div>
              <Tabs defaultValue="overview" className="tabs-shell">
                <TabsList className="tabs">
                  <TabsTrigger value="overview">{language === 'en' ? 'Overview' : 'Tổng quan'}</TabsTrigger>
                  <TabsTrigger value="scores">{language === 'en' ? 'Scores' : 'Điểm số'}</TabsTrigger>
                  <TabsTrigger value="notes">{language === 'en' ? 'Notes' : 'Ghi chú'}</TabsTrigger>
                  <TabsTrigger value="insight">AI Insight</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="detail-stack">
                <div className="chart-card">
                  <TrendChart student={selectedAttention} language={language} />
                </div>
                <div className="insight-grid">
                  <div className="insight-box">
                    <strong>{language === 'en' ? 'Risk Reasons' : 'Lý do rủi ro'}</strong>
                    <ul className="insight-list">{selectedAttention.weakCategories.slice(0, 4).map((item) => <li key={item}>{buildRiskReasonDetail(selectedAttention, item, language)}</li>)}</ul>
                  </div>
                  <div className="insight-box">
                    <strong>{language === 'en' ? 'Lumi Suggestions' : 'Lumi gợi ý'}</strong>
                    <ul className="insight-list">{buildStudentSuggestions(selectedAttention, language).map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                </div>
              </div>
            </Panel>
          ) : null}
        </section>

      </section>

      <div className="chat-widget-shell">
        {isChatOpen ? (
          <Card className="chat-widget">
            <div className="chat-widget-header">
              <div>
                <h3>{language === 'en' ? 'Chat with Lumi' : 'Chat với Lumi'}</h3>
                <p>{language === 'en' ? 'Ask for support plans and teaching suggestions.' : 'Hỏi thêm về kế hoạch hỗ trợ và gợi ý giảng dạy.'}</p>
              </div>
              <Button variant="ghost" size="sm" className="chat-widget-close" onClick={() => setIsChatOpen(false)}>
                <X aria-hidden="true" />
              </Button>
            </div>

            <ScrollArea className="chat-widget-log">
              <div className="chat-stack">
                {chat.map((message, index) => (
                  <p className={message.role} key={`${message.role}-${index}`}>{message.content}</p>
                ))}
                {isChatting ? <p className="lumi">{language === 'en' ? 'Lumi is thinking...' : 'Lumi đang suy nghĩ...'}</p> : null}
              </div>
            </ScrollArea>

            <div className="chat-widget-input">
              <Input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && void askLumi()}
                placeholder={language === 'en' ? 'Ask Lumi...' : 'Hỏi Lumi...'}
              />
              <Button onClick={() => void askLumi()}>
                <Send />
                {language === 'en' ? 'Send' : 'Gửi'}
              </Button>
            </div>
          </Card>
        ) : null}

        <Button className="chat-widget-toggle" onClick={() => setIsChatOpen((open) => !open)}>
          <MessageCircle aria-hidden="true" />
          {language === 'en' ? 'Chat with Lumi' : 'Chat với Lumi'}
        </Button>
      </div>

      {analyzePopup.open ? (
        <div className="analyze-popup-backdrop" role="dialog" aria-modal="true" aria-labelledby="analyze-popup-title">
          <Card className="analyze-popup-card">
            <CardHeader>
              <CardTitle id="analyze-popup-title">{analyzePopup.title}</CardTitle>
              <CardDescription>{analyzePopup.detail}</CardDescription>
            </CardHeader>
            <CardContent className="analyze-popup-content">
              {analyzePopup.status === 'analyzing' ? (
                <div className="analyze-animation" aria-hidden="true">
                  <div className="analyze-orb" />
                  <div className="analyze-rings">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="analyze-bars">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              ) : null}

              {analyzePopup.status === 'success' ? (
                <div className="analyze-result success">
                  <CheckCircle2 aria-hidden="true" />
                  <p>{language === 'en' ? 'Everything is ready. Your dashboard is now refreshed with the latest analysis.' : 'Mọi thứ đã sẵn sàng. Dashboard đã được cập nhật với kết quả mới nhất.'}</p>
                </div>
              ) : null}

              {analyzePopup.status === 'error' ? (
                <div className="analyze-result error">
                  <AlertCircle aria-hidden="true" />
                  <p>{language === 'en' ? 'Please review the CSV format and try again.' : 'Vui lòng kiểm tra định dạng CSV và thử lại.'}</p>
                </div>
              ) : null}

              <div className="analyze-popup-actions">
                {analyzePopup.status === 'analyzing' ? null : (
                  <>
                    <Button variant="outline" onClick={closeAnalyzePopup}>
                      {language === 'en' ? 'Close' : 'Đóng'}
                    </Button>
                    <Button onClick={refreshDashboard}>
                      {language === 'en' ? 'Refresh dashboard' : 'Làm mới dashboard'}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {isClassPickerOpen ? (
        <div className="class-picker-backdrop" role="dialog" aria-modal="true" aria-labelledby="class-picker-title">
          <Card className="class-picker-card">
            <CardHeader>
              <CardTitle id="class-picker-title">{language === 'en' ? 'Switch Class' : 'Đổi lớp'}</CardTitle>
              <CardDescription>
                {language === 'en'
                  ? `You have ${savedClasses.length} saved class ${savedClasses.length > 1 ? 'views' : 'view'} from uploaded CSV files.`
                  : `Bạn đang có ${savedClasses.length} lớp đã lưu từ các file CSV đã tải lên.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="class-picker-content">
              <div className="class-list">
                {savedClasses.map((item) => (
                  <button
                    className={item.id === currentClassId ? 'class-item active' : 'class-item'}
                    key={item.id}
                    onClick={() => switchClass(item.id)}
                  >
                    <div>
                      <strong>{item.className}</strong>
                      <span>{language === 'en' ? `Subject: ${item.subject}` : `Môn: ${item.subject}`}</span>
                      <small>{language === 'en' ? 'Updated' : 'Cập nhật'}: {formatTimestamp(item.updatedAt, language)}</small>
                    </div>
                    {item.id === currentClassId ? (
                      <Badge variant="success">{language === 'en' ? 'Current' : 'Hiện tại'}</Badge>
                    ) : null}
                  </button>
                ))}
              </div>
              <div className="class-picker-actions">
                <Button variant="outline" onClick={() => setIsClassPickerOpen(false)}>
                  {language === 'en' ? 'Close' : 'Đóng'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </main>
  );
}

function Kpi({ title, value, note, delta, accent, icon }: { title: string; value: number; note: string; delta?: string; accent: string; icon: ReactNode }) {
  return (
    <Card className="kpi">
      <CardContent className="kpi-content">
        <span>{title}</span>
        <div className="kpi-value"><strong>{value}</strong>{delta ? <em>{delta}</em> : null}<i className={accent}>{icon}</i></div>
        <p>{note}</p>
      </CardContent>
    </Card>
  );
}

function Panel({ title, className = '', children, language = 'vi' }: { title: string; className?: string; children: ReactNode; language?: Language }) {
  return (
    <Card className={`panel ${className}`}>
      <CardHeader className="panel-header">
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {title.includes('Lumi') || title.includes('AI')
            ? (language === 'en' ? 'Suggestions based on current data' : 'Đề xuất dựa trên dữ liệu hiện tại')
            : (language === 'en' ? 'Updated after the latest analysis' : 'Cập nhật sau lần phân tích mới nhất')}
        </CardDescription>
      </CardHeader>
      <CardContent className="panel-content">
        {children}
      </CardContent>
    </Card>
  );
}

function Donut({ analysis, language }: { analysis: ClassAnalysis; language: Language }) {
  const high = percent(analysis.riskCounts.high, analysis.totalStudents);
  const medium = percent(analysis.riskCounts.medium, analysis.totalStudents);
  return (
    <div className="donut-wrap">
      <div className="donut" style={{ background: `conic-gradient(#ff4d5f 0 ${high}%, #f59e0b ${high}% ${high + medium}%, #35c987 ${high + medium}% 100%)` }}>
        <div><strong>{analysis.totalStudents}</strong><span>{language === 'en' ? 'students' : 'học sinh'}</span></div>
      </div>
      <div className="legend">
        {analysis.riskDistribution.map((item) => (
          <p key={item.level}><i style={{ background: item.color }} />{language === 'en' ? riskLabel(item.level, 'en') : item.label}<strong>{item.value} ({percent(item.value, analysis.totalStudents)}%)</strong></p>
        ))}
      </div>
    </div>
  );
}

function RiskPill({ level, language }: { level: RiskLevel; language: Language }) {
  const variant = level === 'high' ? 'danger' : level === 'medium' ? 'warning' : 'success';
  return <Badge className={`risk-pill ${level}`} variant={variant}>{riskLabel(level, language)}</Badge>;
}

function TrendChart({ student, language }: { student: StudentAnalysis; language: Language }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const chartWidth = 316;
  const chartHeight = 140;
  const offsetX = 24;
  const offsetY = 24;
  const total = Math.max(student.trendPoints.length - 1, 1);
  const pointsWithCoordinates = student.trendPoints.map((point, index) => {
    const x = offsetX + (index / total) * chartWidth;
    const y = offsetY + chartHeight - (point.value / 10) * chartHeight;
    return { ...point, x, y, index };
  });
  const hoveredPoint = typeof hoveredIndex === 'number' ? pointsWithCoordinates[hoveredIndex] : null;

  return (
    <div className="trend">
      <h3>{language === 'en' ? 'Score Trend' : 'Xu hướng điểm số'}</h3>
      <div className="trend-chart-shell" onMouseLeave={() => setHoveredIndex(null)}>
        <svg viewBox="0 0 360 190" aria-label={language === 'en' ? 'Score trend chart' : 'Biểu đồ xu hướng điểm số'}>
          {[0, 1, 2, 3].map((line) => <line key={line} x1="24" x2="340" y1={32 + line * 40} y2={32 + line * 40} />)}
          <polyline points={points(student, 316, 140, 24, 24)} />
          {pointsWithCoordinates.map((point) => (
            <g key={`${point.label}-${point.index}`}>
              <circle className="trend-dot" cx={point.x} cy={point.y} r="4.5" />
              <circle
                className="trend-dot-hit"
                cx={point.x}
                cy={point.y}
                r="11"
                onMouseEnter={() => setHoveredIndex(point.index)}
              >
                <title>{`${translateDynamicText(point.label, language)}: ${point.value.toFixed(1)}`}</title>
              </circle>
            </g>
          ))}
          {student.trendPoints.map((point, index) => <text key={point.label} x={24 + index * (316 / Math.max(student.trendPoints.length - 1, 1))} y="178">{translateDynamicText(point.label, language)}</text>)}
        </svg>
        {hoveredPoint ? (
          <div
            className="trend-tooltip"
            style={{
              left: `${(hoveredPoint.x / 360) * 100}%`,
              top: `${(hoveredPoint.y / 190) * 100}%`
            }}
          >
            <strong>{translateDynamicText(hoveredPoint.label, language)}</strong>
            <span>{language === 'en' ? 'Score' : 'Điểm'}: {hoveredPoint.value.toFixed(1)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function points(student: StudentAnalysis, width: number, height: number, offsetX = 0, offsetY = 0) {
  const total = Math.max(student.trendPoints.length - 1, 1);
  return student.trendPoints.map((point, index) => {
    const x = offsetX + (index / total) * width;
    const y = offsetY + height - (point.value / 10) * height;
    return `${x},${y}`;
  }).join(' ');
}

function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

function formatTrend(trend: number, language: Language) {
  if (trend > 0) {
    return language === 'en' ? `+${trend.toFixed(1)} improving` : `+${trend.toFixed(1)} đang cải thiện`;
  }
  if (trend < 0) {
    return language === 'en' ? `${trend.toFixed(1)} declining` : `${trend.toFixed(1)} đang giảm`;
  }
  return language === 'en' ? 'Stable' : 'Ổn định';
}

function buildRiskReasonDetail(student: StudentAnalysis, reason: string, language: Language) {
  const localizedReason = translateDynamicText(reason, language);

  if (reason === 'Thiếu bài tập về nhà') {
    const missed = student.student.homeworkMissing ?? 0;
    return language === 'en'
      ? `${localizedReason}: Missing ${missed} homework tasks, which can weaken retention and exam readiness.`
      : `${localizedReason}: Thiếu ${missed} bài tập, làm giảm khả năng ghi nhớ và sẵn sàng cho bài kiểm tra.`;
  }

  if (reason === 'Ít tham gia phát biểu') {
    const participation = student.student.participation ?? 0;
    return language === 'en'
      ? `${localizedReason}: Participation score is ${participation.toFixed(1)}/10, showing low classroom engagement.`
      : `${localizedReason}: Điểm tham gia là ${participation.toFixed(1)}/10, thể hiện mức độ tương tác trên lớp còn thấp.`;
  }

  if (reason === 'Vắng nhiều') {
    const attendance = student.student.attendance ?? 0;
    return language === 'en'
      ? `${localizedReason}: Attendance is ${attendance.toFixed(0)}%, creating gaps in lesson continuity.`
      : `${localizedReason}: Tỷ lệ chuyên cần ${attendance.toFixed(0)}%, dễ tạo khoảng trống kiến thức theo tiến độ bài học.`;
  }

  const point = student.trendPoints.find((item) => item.label === reason);
  if (point) {
    return language === 'en'
      ? `${localizedReason}: Current score is ${point.value.toFixed(1)}/10, below the expected threshold (6.0).`
      : `${localizedReason}: Điểm hiện tại là ${point.value.toFixed(1)}/10, thấp hơn ngưỡng kỳ vọng (6.0).`;
  }

  return language === 'en'
    ? `${localizedReason}: This factor is contributing to a higher support priority for this student.`
    : `${localizedReason}: Yếu tố này đang góp phần làm tăng mức ưu tiên hỗ trợ cho học sinh.`;
}

function buildStudentSuggestions(student: StudentAnalysis, language: Language) {
  const name = student.student.name;
  const suggestions: string[] = [];

  suggestions.push(
    language === 'en'
      ? `Schedule a 1:1 check-in with ${name} this week to align goals and support priorities.`
      : `Lên lịch gặp 1:1 với ${name} trong tuần này để thống nhất mục tiêu và ưu tiên hỗ trợ.`
  );

  if ((student.student.homeworkMissing ?? 0) >= 3) {
    suggestions.push(
      language === 'en'
        ? `Set a 2-week homework recovery plan for ${name} with clear submission checkpoints.`
        : `Thiết lập kế hoạch bù bài tập 2 tuần cho ${name} với các mốc nộp bài rõ ràng.`
    );
  }

  if ((student.student.attendance ?? 100) < 85) {
    suggestions.push(
      language === 'en'
        ? `Follow up attendance for ${name} and coordinate with guardian if absence risk continues.`
        : `Theo dõi chuyên cần của ${name} và phối hợp với phụ huynh nếu nguy cơ nghỉ học tiếp diễn.`
    );
  }

  if ((student.student.participation ?? 10) < 5.5) {
    suggestions.push(
      language === 'en'
        ? `Use low-pressure speaking prompts to increase ${name}'s class participation step by step.`
        : `Dùng câu hỏi dẫn dắt áp lực thấp để tăng dần mức tham gia phát biểu của ${name}.`
    );
  }

  if (suggestions.length < 3) {
    suggestions.push(
      language === 'en'
        ? `Assign ${name} a focused practice set on weak skills and review progress after one week.`
        : `Giao bộ bài tập trọng tâm theo kỹ năng còn yếu cho ${name} và rà soát tiến độ sau 1 tuần.`
    );
  }

  return suggestions.slice(0, 3);
}

function buildPotentialReasonDetails(student: StudentAnalysis, language: Language) {
  const strengths = student.strengths.slice(0, 3).map((item) => translateDynamicText(item, language));
  const topStrength = strengths[0] || (language === 'en' ? 'Consistent performance' : 'Năng lực ổn định');
  return [
    language === 'en'
      ? `Average score is ${student.average.toFixed(1)}/10 with a ${formatTrend(student.trend, 'en').toLowerCase()} trajectory.`
      : `Điểm trung bình ${student.average.toFixed(1)}/10 với xu hướng ${formatTrend(student.trend, 'vi').toLowerCase()}.`,
    language === 'en'
      ? `Strongest competency is ${topStrength}, showing readiness for higher-complexity tasks.`
      : `Năng lực nổi bật là ${topStrength}, cho thấy khả năng sẵn sàng với nhiệm vụ có độ khó cao hơn.`,
    language === 'en'
      ? `Current risk level is low, suitable for enrichment track instead of remediation.`
      : `Mức rủi ro hiện tại là thấp, phù hợp với định hướng bồi dưỡng thay vì hỗ trợ khắc phục.`
  ];
}

function buildPotentialSuggestions(student: StudentAnalysis, language: Language) {
  const name = student.student.name;
  return [
    language === 'en'
      ? `Assign ${name} an advanced extension task and ask for a short presentation in class.`
      : `Giao cho ${name} một nhiệm vụ mở rộng nâng cao và trình bày ngắn trước lớp.`,
    language === 'en'
      ? `Use ${name} as a peer mentor in group work to support medium-risk students.`
      : `Phân công ${name} hỗ trợ bạn học theo mô hình kèm cặp trong hoạt động nhóm.`,
    language === 'en'
      ? `Track progress with a challenge rubric every two weeks to sustain growth momentum.`
      : `Theo dõi tiến độ bằng rubric thử thách mỗi 2 tuần để duy trì đà phát triển.`
  ];
}

function getAttentionStudents(analysis: ClassAnalysis) {
  const focused = analysis.students.filter((student) => student.riskLevel === 'high' || student.riskLevel === 'medium');
  return focused.length > 0 ? focused : analysis.students;
}

function getPotentialStudents(analysis: ClassAnalysis) {
  return analysis.students.filter((student) => student.riskLevel === 'low' && student.average >= 8 && student.trend >= 0);
}

function navIcon(index: number) {
  const icons = [LayoutDashboard, Users, Brain, CalendarCheck, FileUp, FileText, Settings];
  const Icon = icons[index] || LayoutDashboard;
  return <Icon aria-hidden="true" />;
}

function BellIcon() {
  return <GraduationCap aria-hidden="true" />;
}

function initials(name?: string) {
  if (!name) return 'GV';
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
  return letters || 'GV';
}

function translateDynamicText(text: string, language: Language) {
  if (language === 'vi') return text;
  const map: Record<string, string> = {
    'Nguy cơ cao': 'High Risk',
    'Nguy cơ trung bình': 'Medium Risk',
    'Nguy cơ thấp': 'Low Risk',
    'Điểm số giảm dần': 'Declining score trend',
    'Thiếu bài tập về nhà': 'Missing homework',
    'Vắng nhiều': 'Frequent absences',
    'Nền tảng kiến thức yếu': 'Weak knowledge foundation',
    'Ít tham gia phát biểu': 'Low class participation',
    'Đang tiến bộ ổn định': 'Stable positive progress',
    'Miệng': 'Oral',
    '15p': '15-min',
    'Thực hành': 'Practice',
    'Dự án': 'Project',
    'Giữa kỳ': 'Midterm',
    'Hiện tại': 'Current',
    'Hoạt động lớp': 'Class activity'
  };
  return map[text] || text;
}

function buildClassId(className?: string, subject?: string) {
  const normalizedClass = (className || 'class').trim().toLowerCase().replace(/\s+/g, '-');
  const normalizedSubject = (subject || 'general').trim().toLowerCase().replace(/\s+/g, '-');
  return `${normalizedClass}__${normalizedSubject}`;
}

function formatTimestamp(timestamp: number, language: Language) {
  try {
    return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

'use client';

import { useMemo, useRef, useState } from 'react';
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
  Send,
  Settings,
  Sparkles,
  Upload,
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
import type { ClassAnalysis, LumiAnalysis, RiskLevel, StudentAnalysis } from '../types/score';

type ChatMessage = {
  role: 'teacher' | 'lumi';
  content: string;
};

const initialAnalysis = analyzeClass(parseCsv(sampleCsv));
const initialLumi = fallbackLumiAnalysis(initialAnalysis);

export function Dashboard() {
  const [workspaceId] = useState(() => {
    if (typeof window === 'undefined') return 'demo';
    const storageKey = 'viteach_workspace_id';
    const existing = window.localStorage.getItem(storageKey);
    if (existing) return existing;
    const next = `ws_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(storageKey, next);
    return next;
  });
  const [csv, setCsv] = useState(sampleCsv);
  const [analysis, setAnalysis] = useState<ClassAnalysis>(initialAnalysis);
  const [lumi, setLumi] = useState<LumiAnalysis>(initialLumi);
  const [selectedId, setSelectedId] = useState(initialAnalysis.students[0]?.student.id);
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [question, setQuestion] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [chat, setChat] = useState<ChatMessage[]>([
    { role: 'lumi', content: 'Cô có thể hỏi Lumi về nhóm học sinh cần chú ý, kế hoạch ôn tập hoặc cách tổ chức gặp 1:1.' }
  ]);
  const fileInput = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => analysis.students.find((student) => student.student.id === selectedId) || analysis.students[0],
    [analysis, selectedId]
  );

  async function runAnalysis(nextCsv = csv) {
    setError('');
    setIsAnalyzing(true);
    try {
      const local = analyzeClass(parseCsv(nextCsv));
      setAnalysis(local);
      setSelectedId(local.students[0]?.student.id);
      setLumi(fallbackLumiAnalysis(local));

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: nextCsv, className: local.className, workspaceId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể phân tích dữ liệu.');
      setAnalysis(data.analysis);
      setLumi(data.lumi);
      setSelectedId(data.analysis.students[0]?.student.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đọc dữ liệu CSV.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleUpload(file: File) {
    const text = await file.text();
    setCsv(text);
    await runAnalysis(text);
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
        body: JSON.stringify({ question: nextQuestion, analysis, workspaceId })
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
            <span className="brand-slogan">Hiểu học sinh - Dạy đúng cách</span>
          </div>
        </div>
        <nav className="nav">
          {['Tổng quan lớp', 'Học sinh', 'AI Phân tích', 'Kế hoạch giảng dạy', 'Nhập dữ liệu', 'Báo cáo', 'Cài đặt'].map((item, index) => (
            <Button className={index === 0 ? 'active' : ''} key={item} variant="ghost">
              {navIcon(index)}
              {item}
            </Button>
          ))}
        </nav>
        <Separator />
        <Card className="teacher-card">
          <Avatar>
            <AvatarFallback>{initials(analysis.teacherName)}</AvatarFallback>
          </Avatar>
          <div>
            <strong>{analysis.teacherName || 'Giáo viên'}</strong>
            <span>{`Giáo viên ${analysis.subject || 'chưa cung cấp môn'}`}</span>
          </div>
        </Card>
        <Card className="class-card">
          <span>Lớp hiện tại</span>
          <strong>{analysis.className}</strong>
          <p>Môn: {analysis.subject || 'Chưa cung cấp'}</p>
          <p>Sĩ số: {analysis.totalStudents} học sinh</p>
          <Button variant="outline">Đổi lớp <span>→</span></Button>
        </Card>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <h1>{`Xin chào ${analysis.teacherName || 'giáo viên'}`}</h1>
            <p>Theo dõi lớp {analysis.className}, phát hiện học sinh cần hỗ trợ và nhận gợi ý giảng dạy từ Lumi.</p>
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
            <Button variant="outline" onClick={() => fileInput.current?.click()}>
              <Upload />
              Nhập dữ liệu
            </Button>
            <Button onClick={() => void runAnalysis()} disabled={isAnalyzing}>
              <Sparkles />
              {isAnalyzing ? 'Đang phân tích...' : 'Phân tích với Lumi'}
            </Button>
          </div>
        </header>

        {error ? (
          <Alert variant="destructive" className="error">
            <AlertCircle />
            <AlertTitle>Không thể phân tích dữ liệu</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <section className="kpi-grid">
          <Kpi title="Tổng học sinh" value={analysis.totalStudents} note="đã phân tích" accent="violet" icon={<Users />} />
          <Kpi title="Học sinh cần chú ý" value={analysis.attentionCount} note="tỷ lệ trên sĩ số lớp" delta={`${percent(analysis.attentionCount, analysis.totalStudents)}%`} accent="amber" icon={<BellIcon />} />
          <Kpi title="Nguy cơ cao" value={analysis.riskCounts.high} note="cần hỗ trợ sớm" accent="red" icon={<AlertCircle />} />
          <Kpi title="Nguy cơ trung bình" value={analysis.riskCounts.medium} note="cần theo dõi" accent="amber" icon={<BarChart3 />} />
          <Kpi title="Nguy cơ thấp" value={analysis.riskCounts.low} note="đang tiến bộ" accent="green" icon={<CheckCircle2 />} />
        </section>

        <section className="dashboard-grid">
          <Panel title="Phân bố mức độ rủi ro" className="risk-panel">
            <Donut analysis={analysis} />
          </Panel>
          <Panel title="Vấn đề nổi bật của lớp">
            <div className="issue-list">
              {analysis.issues.map((issue) => (
                <div className="issue-row" key={issue.label}>
                  <span>{issue.label}</span>
                  <div><i style={{ width: `${Math.max(issue.percent, 8)}%` }} /></div>
                  <strong>{issue.count} học sinh</strong>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Gợi ý hành động từ Lumi">
            <div className="suggestions">
              {lumi.teachingSuggestions.slice(0, 3).map((item) => <p key={item}>{item}</p>)}
            </div>
            <Button className="link-button" variant="link">Xem kế hoạch chi tiết →</Button>
          </Panel>
        </section>

        <section className="lower-grid">
          <Panel title="Học sinh cần chú ý" className="student-list-panel">
            <div className="table-head">
              <span>Học sinh</span>
              <span>Mức độ rủi ro</span>
              <span>Xu hướng</span>
              <span>Vấn đề chính</span>
            </div>
            {analysis.students.slice(0, 6).map((student) => (
              <button
                className={selected?.student.id === student.student.id ? 'student-row selected' : 'student-row'}
                key={student.student.id}
                onClick={() => setSelectedId(student.student.id)}
              >
                <span><b>{student.student.name}</b><small>SBD: {student.student.id}</small></span>
                <RiskPill level={student.riskLevel} />
                <Sparkline student={student} />
                <span>{student.issue}</span>
              </button>
            ))}
          </Panel>

          {selected ? (
            <Panel className="student-detail" title={`${selected.student.name} · ${riskLabel(selected.riskLevel)}`}>
              <div className="student-meta">SBD: {selected.student.id} | {selected.student.gender || 'N/A'} | {analysis.className}</div>
              <Tabs defaultValue="overview" className="tabs-shell">
                <TabsList className="tabs">
                  <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                  <TabsTrigger value="scores">Điểm số</TabsTrigger>
                  <TabsTrigger value="notes">Ghi chú</TabsTrigger>
                  <TabsTrigger value="insight">AI Insight</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="detail-grid">
                <TrendChart student={selected} />
                <div className="insight-box">
                  <strong>Lumi Insight</strong>
                  <h4>Lý do rủi ro</h4>
                  <ul>{selected.weakCategories.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
                  <h4>Lumi gợi ý</h4>
                  <ul>{lumi.meetingSuggestions.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              </div>
            </Panel>
          ) : null}
        </section>

        <section className="chat-panel">
          <div>
            <h2>Chat với Lumi</h2>
            <p>Hỏi thêm về kế hoạch hỗ trợ, nhóm học sinh hoặc cách dạy phù hợp với dữ liệu hiện tại.</p>
          </div>
          <ScrollArea className="chat-log">
            <div className="chat-stack">
              {chat.map((message, index) => (
                <p className={message.role} key={`${message.role}-${index}`}>{message.content}</p>
              ))}
              {isChatting ? <p className="lumi">Lumi đang suy nghĩ...</p> : null}
            </div>
          </ScrollArea>
          <div className="chat-input">
            <Input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void askLumi()} placeholder="Ví dụ: Tuần này nên gặp học sinh nào trước?" />
            <Button onClick={() => void askLumi()}>
              <Send />
              Gửi
            </Button>
          </div>
        </section>
      </section>
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

function Panel({ title, className = '', children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <Card className={`panel ${className}`}>
      <CardHeader className="panel-header">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{title.includes('Lumi') ? 'Đề xuất dựa trên dữ liệu hiện tại' : 'Cập nhật sau lần phân tích mới nhất'}</CardDescription>
      </CardHeader>
      <CardContent className="panel-content">
        {children}
      </CardContent>
    </Card>
  );
}

function Donut({ analysis }: { analysis: ClassAnalysis }) {
  const high = percent(analysis.riskCounts.high, analysis.totalStudents);
  const medium = percent(analysis.riskCounts.medium, analysis.totalStudents);
  return (
    <div className="donut-wrap">
      <div className="donut" style={{ background: `conic-gradient(#ff4d5f 0 ${high}%, #f59e0b ${high}% ${high + medium}%, #35c987 ${high + medium}% 100%)` }}>
        <div><strong>{analysis.totalStudents}</strong><span>học sinh</span></div>
      </div>
      <div className="legend">
        {analysis.riskDistribution.map((item) => (
          <p key={item.level}><i style={{ background: item.color }} />{item.label}<strong>{item.value} ({percent(item.value, analysis.totalStudents)}%)</strong></p>
        ))}
      </div>
    </div>
  );
}

function RiskPill({ level }: { level: RiskLevel }) {
  const variant = level === 'high' ? 'danger' : level === 'medium' ? 'warning' : 'success';
  return <Badge className={`risk-pill ${level}`} variant={variant}>{riskLabel(level)}</Badge>;
}

function Sparkline({ student }: { student: StudentAnalysis }) {
  return <svg className="spark" viewBox="0 0 110 38" aria-hidden="true"><polyline points={points(student, 110, 38)} /></svg>;
}

function TrendChart({ student }: { student: StudentAnalysis }) {
  return (
    <div className="trend">
      <h3>Xu hướng điểm số</h3>
      <svg viewBox="0 0 360 190" aria-label="Biểu đồ xu hướng điểm số">
        {[0, 1, 2, 3].map((line) => <line key={line} x1="24" x2="340" y1={32 + line * 40} y2={32 + line * 40} />)}
        <polyline points={points(student, 316, 140, 24, 24)} />
        {student.trendPoints.map((point, index) => <text key={point.label} x={24 + index * (316 / Math.max(student.trendPoints.length - 1, 1))} y="178">{point.label}</text>)}
      </svg>
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

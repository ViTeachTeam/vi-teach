import { analyzeClass } from './analysis';
import { parseCsv } from './csv';
import { sampleCsv } from '../data/sampleCsv';

describe('CSV parsing', () => {
  it('accepts Vietnamese names and valid sample data', () => {
    const students = parseCsv(sampleCsv);
    expect(students[0].name).toBe('Nguyễn Minh An');
    expect(students).toHaveLength(20);
  });

  it('accepts Vietnamese CSV with semicolon delimiter and comma decimals', () => {
    const vietnameseCsv = [
      'Họ tên;Lớp học;Môn học;Điểm miệng;Điểm 15 phút;Điểm giữa kỳ;Điểm cuối kỳ;Chuyên cần;Thiếu bài tập',
      'Nguyễn Văn A;10A1;Toán;7,5;8,0;7,0;8,2;95;1',
      'Trần Thị B;10A1;Toán;6,8;7,1;6,9;7,0;92;2'
    ].join('\n');

    const students = parseCsv(vietnameseCsv);
    expect(students).toHaveLength(2);
    expect(students[0].name).toBe('Nguyễn Văn A');
    expect(students[0].oralScore).toBe(7.5);
    expect(students[0].score15m).toBe(8);
    expect(students[0].final).toBe(8.2);
  });

  it('rejects missing student names', () => {
    expect(() => parseCsv('student_name,final\n,8')).toThrow('thiếu họ tên');
  });

  it('rejects scores outside the 0-10 scale', () => {
    expect(() => parseCsv('student_name,final\nLan,12')).toThrow('0-10');
  });
});

describe('class analysis', () => {
  it('classifies risk levels and produces chart aggregates', () => {
    const analysis = analyzeClass(parseCsv(sampleCsv));
    expect(analysis.totalStudents).toBe(20);
    expect(analysis.riskCounts.high).toBeGreaterThan(0);
    expect(analysis.riskDistribution.reduce((sum, item) => sum + item.value, 0)).toBe(20);
  });

  it('detects steep declining trend as high risk', () => {
    const analysis = analyzeClass(parseCsv('student_name,oral_score,final\nLan,8,5'));
    expect(analysis.students[0].riskLevel).toBe('high');
  });
});

import type { StudentScore } from '../types/score';

const aliases: Record<keyof StudentScore, string[]> = {
  id: ['student_id', 'id', 'sbd', 'ma_hoc_sinh'],
  name: ['student_name', 'name', 'ho_ten', 'họ tên', 'hoten'],
  gender: ['gender', 'gioi_tinh'],
  className: ['class_name', 'class', 'lop'],
  teacherName: ['teacher_name', 'teacher', 'giao_vien', 'ten_giao_vien'],
  subject: ['subject', 'mon_hoc', 'mon'],
  oralScore: ['oral_score', 'diem_mieng', 'mieng'],
  score15m: ['score_15m', 'diem_15p', '15p'],
  bonus: ['bonus', 'diem_cong'],
  penalty: ['penalty', 'diem_tru'],
  midterm: ['midterm', 'diem_giua_ky', 'giuaky'],
  final: ['final', 'diem_cuoi_ky', 'cuoiky'],
  practice: ['practice', 'thuc_hanh'],
  project: ['project', 'du_an'],
  classActivity: ['class_activity', 'hoat_dong_lop'],
  attendance: ['attendance', 'chuyen_can'],
  homeworkMissing: ['homework_missing', 'thieu_bai_tap'],
  participation: ['participation', 'phat_bieu']
};

const numericFields: (keyof StudentScore)[] = [
  'oralScore',
  'score15m',
  'bonus',
  'penalty',
  'midterm',
  'final',
  'practice',
  'project',
  'classActivity',
  'attendance',
  'homeworkMissing',
  'participation'
];

export function parseCsv(input: string): StudentScore[] {
  const rows = splitRows(input.trim());
  if (rows.length < 2) {
    throw new Error('CSV cần có dòng tiêu đề và ít nhất một học sinh.');
  }

  const headers = splitCsvLine(rows[0]).map(normalizeHeader);
  const students = rows.slice(1).filter(Boolean).map((row, index) => {
    const values = splitCsvLine(row);
    const record: Partial<StudentScore> = {};

    for (const field of Object.keys(aliases) as (keyof StudentScore)[]) {
      const columnIndex = headers.findIndex((header) => aliases[field].includes(header));
      if (columnIndex === -1) continue;

      const raw = values[columnIndex]?.trim() ?? '';
      if (!raw) continue;

      if (numericFields.includes(field)) {
        const value = Number(raw.replace(',', '.'));
        if (!Number.isFinite(value)) {
          throw new Error(`Dòng ${index + 2}: giá trị "${raw}" không phải là số.`);
        }
        if (field !== 'attendance' && field !== 'homeworkMissing' && (value < 0 || value > 10)) {
          throw new Error(`Dòng ${index + 2}: điểm phải nằm trong thang 0-10.`);
        }
        (record as Record<string, number>)[field] = value;
      } else {
        (record as Record<string, string>)[field] = raw;
      }
    }

    if (!record.name) {
      throw new Error(`Dòng ${index + 2}: thiếu họ tên học sinh.`);
    }

    return {
      id: record.id || `S${String(index + 1).padStart(3, '0')}`,
      name: record.name,
      ...record
    } as StudentScore;
  });

  if (!students.some((student) => numericFields.some((field) => typeof student[field] === 'number'))) {
    throw new Error('CSV cần có ít nhất một cột điểm số.');
  }

  return students;
}

function splitRows(input: string) {
  return input.replace(/^\uFEFF/, '').split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function normalizeHeader(header: string) {
  return header
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
}

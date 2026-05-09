import type { StudentScore } from '../types/score';

const aliases: Record<keyof StudentScore, string[]> = {
  id: ['student_id', 'id', 'sbd', 'ma_hoc_sinh'],
  name: ['student_name', 'name', 'ho_ten', 'họ tên', 'hoten'],
  gender: ['gender', 'gioi_tinh', 'gioi tinh'],
  className: ['class_name', 'class', 'lop', 'lop_hoc'],
  teacherName: ['teacher_name', 'teacher', 'giao_vien', 'ten_giao_vien', 'giao vien', 'ten giao vien'],
  subject: ['subject', 'mon_hoc', 'mon', 'mon hoc'],
  oralScore: ['oral_score', 'diem_mieng', 'mieng', 'diem mieng'],
  score15m: ['score_15m', 'diem_15p', '15p', 'diem_15_phut', 'diem 15 phut'],
  bonus: ['bonus', 'diem_cong', 'diem cong'],
  penalty: ['penalty', 'diem_tru', 'diem tru'],
  midterm: ['midterm', 'diem_giua_ky', 'giuaky', 'diem giua ky'],
  final: ['final', 'diem_cuoi_ky', 'cuoiky', 'diem cuoi ky'],
  practice: ['practice', 'thuc_hanh', 'thuc hanh'],
  project: ['project', 'du_an', 'du an'],
  classActivity: ['class_activity', 'hoat_dong_lop', 'hoat dong lop'],
  attendance: ['attendance', 'chuyen_can', 'chuyen can'],
  homeworkMissing: ['homework_missing', 'thieu_bai_tap', 'thieu bai tap'],
  participation: ['participation', 'phat_bieu', 'phat bieu']
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

  const delimiter = detectDelimiter(rows[0]);
  const headers = splitCsvLine(rows[0], delimiter).map(normalizeHeader);
  const students = rows.slice(1).filter(Boolean).map((row, index) => {
    const values = splitCsvLine(row, delimiter);
    const record: Partial<StudentScore> = {};

    for (const field of Object.keys(aliases) as (keyof StudentScore)[]) {
      const columnIndex = headers.findIndex((header) => aliases[field].includes(header));
      if (columnIndex === -1) continue;

      const raw = values[columnIndex]?.trim() ?? '';
      if (!raw) continue;

      if (numericFields.includes(field)) {
        const value = parseNumeric(raw);
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

function detectDelimiter(headerRow: string) {
  const semicolonCount = (headerRow.match(/;/g) || []).length;
  const commaCount = (headerRow.match(/,/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

function splitCsvLine(line: string, delimiter: ',' | ';') {
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
    } else if (char === delimiter && !quoted) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function parseNumeric(raw: string) {
  const cleaned = raw.trim().replace(/\s/g, '');
  const normalized = cleaned.includes(',') && !cleaned.includes('.')
    ? cleaned.replace(',', '.')
    : cleaned;
  return Number(normalized);
}

function normalizeHeader(header: string) {
  return header
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, '_');
}

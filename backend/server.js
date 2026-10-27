import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const validStatuses = new Set(['Present', 'Absent', 'On Leave']);

app.get('/api/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', message: 'EduAttend Pro API is running' });
}));

app.get('/api/students', asyncRoute(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const result = await pool.query(
    `SELECT id, roll_no, full_name, email, course, semester
     FROM students
     WHERE ($1 = '' OR full_name ILIKE '%' || $1 || '%' OR roll_no ILIKE '%' || $1 || '%')
     ORDER BY full_name ASC`,
    [q]
  );
  res.json(result.rows);
}));

app.post('/api/students', asyncRoute(async (req, res) => {
  const { roll_no, full_name, email, course = 'Computer Science', semester = 1 } = req.body;
  if (![roll_no, full_name, email].every(v => typeof v === 'string' && v.trim())) {
    return res.status(400).json({ error: 'Roll number, full name, and email are required.' });
  }
  const sem = Number(semester);
  if (!Number.isInteger(sem) || sem < 1 || sem > 12) {
    return res.status(400).json({ error: 'Semester must be between 1 and 12.' });
  }
  const result = await pool.query(
    `INSERT INTO students (roll_no, full_name, email, course, semester)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, roll_no, full_name, email, course, semester`,
    [roll_no.trim(), full_name.trim(), email.trim(), String(course).trim() || 'Computer Science', sem]
  );
  res.status(201).json(result.rows[0]);
}));

app.put('/api/students/:id', asyncRoute(async (req, res) => {
  const { roll_no, full_name, email, course = 'Computer Science', semester = 1 } = req.body;
  if (![roll_no, full_name, email].every(v => typeof v === 'string' && v.trim())) {
    return res.status(400).json({ error: 'Roll number, full name, and email are required.' });
  }
  const sem = Number(semester);
  if (!Number.isInteger(sem) || sem < 1 || sem > 12) {
    return res.status(400).json({ error: 'Semester must be between 1 and 12.' });
  }
  const result = await pool.query(
    `UPDATE students SET roll_no=$1, full_name=$2, email=$3, course=$4, semester=$5
     WHERE id=$6 RETURNING id, roll_no, full_name, email, course, semester`,
    [roll_no.trim(), full_name.trim(), email.trim(), String(course).trim() || 'Computer Science', sem, req.params.id]
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Student not found.' });
  res.json(result.rows[0]);
}));

app.delete('/api/students/:id', asyncRoute(async (req, res) => {
  const result = await pool.query('DELETE FROM students WHERE id=$1 RETURNING id', [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Student not found.' });
  res.status(204).end();
}));

app.get('/api/attendance', asyncRoute(async (req, res) => {
  const date = String(req.query.date || new Date().toISOString().slice(0, 10));
  const result = await pool.query(
    `SELECT s.id AS student_id, s.roll_no, s.full_name,
            a.status
     FROM students s
     LEFT JOIN attendance a ON a.student_id=s.id AND a.attendance_date=$1
     ORDER BY s.full_name ASC`,
    [date]
  );
  res.json(result.rows);
}));

app.put('/api/attendance/bulk', asyncRoute(async (req, res) => {
  const { date, records } = req.body;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Provide a date (YYYY-MM-DD) and records array.' });
  }
  for (const record of records) {
    if (!Number.isInteger(Number(record.student_id)) || !validStatuses.has(record.status)) {
      return res.status(400).json({ error: 'Each record needs a valid student_id and status.' });
    }
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const record of records) {
      await client.query(
        `INSERT INTO attendance (student_id, attendance_date, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (student_id, attendance_date)
         DO UPDATE SET status=EXCLUDED.status`,
        [Number(record.student_id), date, record.status]
      );
    }
    await client.query('COMMIT');
    res.json({ message: 'Attendance saved.', count: records.length });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

app.get('/api/reports', asyncRoute(async (_req, res) => {
  const result = await pool.query(
    `SELECT s.id, s.roll_no, s.full_name, s.course, s.semester,
      COUNT(a.id) FILTER (WHERE a.status IN ('Present','Absent'))::int AS total_sessions,
      COUNT(a.id) FILTER (WHERE a.status='Present')::int AS present,
      COUNT(a.id) FILTER (WHERE a.status='Absent')::int AS absent,
      COUNT(a.id) FILTER (WHERE a.status='On Leave')::int AS on_leave,
      CASE WHEN COUNT(a.id) FILTER (WHERE a.status IN ('Present','Absent')) = 0 THEN 0
           ELSE ROUND(100.0 * COUNT(a.id) FILTER (WHERE a.status='Present') /
                      COUNT(a.id) FILTER (WHERE a.status IN ('Present','Absent')), 1)
      END AS percentage
     FROM students s LEFT JOIN attendance a ON a.student_id=s.id
     GROUP BY s.id ORDER BY s.full_name`,
  );
  res.json(result.rows);
}));

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === '23505') return res.status(409).json({ error: 'That roll number already exists.' });
  if (err.code === '23503') return res.status(400).json({ error: 'Invalid student reference.' });
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => console.log(`EduAttend Pro API running at http://localhost:${PORT}`));

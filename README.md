# EduAttend Pro — Student Attendance Management System

A full-stack college project built with React, Express, Node.js, and PostgreSQL.

## Features
- Dashboard summary cards: students, present, absent, average attendance
- Add, edit, search, and delete student records
- Mark attendance by date: Present, Absent, or On Leave
- Filter attendance by date and status
- Student attendance percentage and report view
- PostgreSQL persistence through an Express REST API

## Requirements
- Node.js 18+
- PostgreSQL 14+
- npm

## 1. Create the database
Open PostgreSQL / pgAdmin and run:
```sql
CREATE DATABASE eduattend;
```
Then connect to the `eduattend` database and run the contents of `backend/schema.sql`.

## 2. Configure the backend
Open a terminal:
```bash
cd backend
npm install
```
Copy `.env.example` to `.env` and set your PostgreSQL credentials:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/eduattend
```
Start the API:
```bash
npm run dev
```
The API runs at http://localhost:5000.

## 3. Start the frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open the URL printed by Vite, usually http://localhost:5173.

## API endpoints
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | API health check |
| GET | `/api/students` | List/search students |
| POST | `/api/students` | Create a student |
| PUT | `/api/students/:id` | Update a student |
| DELETE | `/api/students/:id` | Delete a student |
| GET | `/api/attendance?date=YYYY-MM-DD` | Attendance for date |
| PUT | `/api/attendance/bulk` | Save attendance records for a date |
| GET | `/api/reports` | Per-student attendance report |

## Notes for your demonstration
1. Add 2–3 students.
2. Choose today's date and mark attendance.
3. Save attendance.
4. Change the date and show that records are date-specific.
5. Open Reports to demonstrate percentages.
6. Explain that React is the frontend, Express provides REST APIs, and PostgreSQL stores the records.

## Viva points
- **CRUD:** Create, Read, Update, Delete student records.
- **REST API:** Frontend communicates with backend using HTTP requests.
- **Database:** Students and attendance are stored in related tables.
- **Attendance percentage:** Present sessions divided by recorded sessions, multiplied by 100. “On Leave” is excluded from the denominator.
- **Validation:** The backend checks required student fields and valid attendance statuses.

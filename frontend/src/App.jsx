import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, Bell, BookOpen,
  CalendarDays, Check, CheckCircle2, ChevronDown, CircleHelp, ClipboardCheck,
  Clock3, Download, LayoutDashboard, LogOut, Menu, MoreHorizontal, Plus,
  Search, Settings, ShieldCheck, SlidersHorizontal, Trash2, UserRound,
  Users, X, Pencil, GraduationCap
} from 'lucide-react';

const API = 'http://localhost:5000/api';
const today = () => new Date().toLocaleDateString('en-CA');
const demoStudents = [
  { id: 'demo-1', roll_no: 'KA2401', full_name: 'Aarav Sharma', email: 'aarav@example.com', course: 'Computer Science', semester: 3 },
  { id: 'demo-2', roll_no: 'KA2402', full_name: 'Ananya Rao', email: 'ananya@example.com', course: 'Computer Science', semester: 3 },
  { id: 'demo-3', roll_no: 'KA2403', full_name: 'Ishaan Kumar', email: 'ishaan@example.com', course: 'Computer Science', semester: 3 },
  { id: 'demo-4', roll_no: 'KA2404', full_name: 'Diya Nair', email: 'diya@example.com', course: 'Computer Science', semester: 3 },
  { id: 'demo-5', roll_no: 'KA2405', full_name: 'Kabir Patel', email: 'kabir@example.com', course: 'Computer Science', semester: 3 }
];
const demoStatuses = { 'demo-1': 'Present', 'demo-2': 'Present', 'demo-3': 'Absent', 'demo-4': 'Present', 'demo-5': 'On Leave' };

function StatCard({ title, value, note, icon: Icon, tone, trend }) {
  return <article className="stat-card">
    <div className="stat-top"><span>{title}</span><span className={`stat-icon ${tone}`}><Icon size={19}/></span></div>
    <div className="stat-value">{value}</div>
    <div className="stat-note"><span className={trend === 'down' ? 'muted' : 'trend'}>{trend === 'down' ? <ArrowDownRight size={15}/> : <ArrowUpRight size={15}/>} {note}</span><span>vs. last session</span></div>
  </article>;
}

function App() {
  const [page, setPage] = useState('Overview');
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [date, setDate] = useState(today());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All status');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ roll_no: '', full_name: '', email: '', course: 'Computer Science', semester: 3 });
  const [notice, setNotice] = useState('');
  const [apiOnline, setApiOnline] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  async function request(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Request failed');
    }
    if (res.status === 204) return null;
    return res.json();
  }

  async function loadStudents() {
    try {
      const rows = await request('/students');
      setStudents(rows);
      setApiOnline(true);
    } catch {
      setApiOnline(false);
      setStudents(prev => prev.length ? prev : demoStudents);
    }
  }

  async function loadAttendance(selectedDate = date, currentStudents = students) {
    try {
      const rows = await request(`/attendance?date=${selectedDate}`);
      const map = {};
      rows.forEach(row => { if (row.status) map[row.student_id] = row.status; });
      setAttendance(map);
      setApiOnline(true);
    } catch {
      setApiOnline(false);
      setAttendance(prev => {
        const map = {};
        currentStudents.forEach(s => { map[s.id] = prev[s.id] || demoStatuses[s.id] || ''; });
        return map;
      });
    }
  }

  useEffect(() => { loadStudents(); }, []);
  useEffect(() => { if (students.length) loadAttendance(date, students); }, [date, students.length]);

  const filteredStudents = useMemo(() => students.filter(s => {
    const term = search.toLowerCase();
    const matches = `${s.full_name} ${s.roll_no} ${s.email || ''}`.toLowerCase().includes(term);
    const status = attendance[s.id] || '';
    return matches && (filter === 'All status' || status === filter);
  }), [students, search, filter, attendance]);

  const counts = useMemo(() => {
    const values = students.map(s => attendance[s.id] || '');
    return {
      present: values.filter(v => v === 'Present').length,
      absent: values.filter(v => v === 'Absent').length,
      leave: values.filter(v => v === 'On Leave').length,
      unmarked: values.filter(v => !v).length
    };
  }, [students, attendance]);

  const reports = useMemo(() => students.map(s => {
    const total = Number(s.total_sessions || 0);
    const present = Number(s.present || 0);
    return { ...s, total, present, percentage: total ? Math.round(present / total * 1000) / 10 : 0 };
  }), [students]);

  function openAdd() {
    setEditing(null);
    setForm({ roll_no: '', full_name: '', email: '', course: 'Computer Science', semester: 3 });
    setModal(true);
  }
  function openEdit(s) {
    setEditing(s);
    setForm({ roll_no: s.roll_no, full_name: s.full_name, email: s.email || '', course: s.course || 'Computer Science', semester: s.semester || 1 });
    setModal(true);
  }
  async function saveStudent(e) {
    e.preventDefault();
    try {
      const saved = await request(editing ? `/students/${editing.id}` : '/students', {
        method: editing ? 'PUT' : 'POST', body: JSON.stringify(form)
      });
      if (editing) setStudents(prev => prev.map(s => s.id === editing.id ? saved : s));
      else setStudents(prev => [...prev, saved]);
      setApiOnline(true);
      setNotice(editing ? 'Student updated successfully.' : 'Student added successfully.');
      setModal(false);
    } catch (err) {
      if (apiOnline) { setNotice(err.message); return; }
      const id = editing?.id || `local-${Date.now()}`;
      const record = { ...form, id: editing?.id || id };
      setStudents(prev => editing ? prev.map(s => s.id === editing.id ? record : s) : [...prev, record]);
      setNotice('Saved in demo mode. Start the backend and database to save permanently.');
      setModal(false);
    }
  }

  async function removeStudent(s) {
    if (!window.confirm(`Delete ${s.full_name}? Their attendance records will also be deleted.`)) return;
    try {
      await request(`/students/${s.id}`, { method: 'DELETE' });
      setApiOnline(true);
    } catch {
      if (apiOnline) { setNotice('Could not delete this student.'); return; }
    }
    setStudents(prev => prev.filter(item => item.id !== s.id));
    setNotice('Student removed.');
  }

  function setStatus(id, status) {
    setAttendance(prev => ({ ...prev, [id]: status }));
  }

  async function saveAttendance() {
    const records = students.filter(s => attendance[s.id]).map(s => ({ student_id: Number(s.id), status: attendance[s.id] }));
    try {
      await request('/attendance/bulk', { method: 'PUT', body: JSON.stringify({ date, records }) });
      setApiOnline(true);
      setNotice(`Attendance saved for ${records.length} students.`);
    } catch {
      setNotice('Demo mode: attendance is temporary. Connect PostgreSQL and start the backend to save permanently.');
    }
  }

  async function loadReports() {
    try {
      const [studentRows, reportRows] = await Promise.all([request('/students'), request('/reports')]);
      setStudents(reportRows);
      setApiOnline(true);
    } catch {
      setNotice('Reports use saved database records. Start the backend and PostgreSQL to load full reports.');
    }
  }

  function navigate(name) {
    setPage(name);
    setMobileNav(false);
    if (name === 'Reports') loadReports();
    else if (name === 'Students') loadStudents();
  }

  function exportCSV() {
    const rows = [['Roll No', 'Student Name', 'Status', 'Date'], ...filteredStudents.map(s => [s.roll_no, s.full_name, attendance[s.id] || 'Unmarked', date])];
    const csv = rows.map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `eduattend-${date}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const navItems = [
    { section: 'MAIN MENU', items: [
      { name: 'Overview', icon: LayoutDashboard },
      { name: 'Students', icon: Users },
      { name: 'Attendance', icon: ClipboardCheck },
      { name: 'Reports', icon: BarChart3 }
    ]},
    { section: 'PREFERENCES', items: [
      { name: 'Settings', icon: Settings },
      { name: 'Help & Support', icon: CircleHelp }
    ]}
  ];

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><GraduationCap size={23}/></div><div><strong>EduAttend<span>Pro</span></strong><small>ATTENDANCE SUITE</small></div><button className="mobile-close" onClick={() => setMobileNav(false)}><X size={18}/></button></div>
      <div className="institution"><div className="institution-logo">Y</div><div><strong>Yenepoya Institute</strong><small>Academic Portal</small></div><ChevronDown size={15}/></div>
      <nav>{navItems.map(group => <div className="nav-group" key={group.section}><p>{group.section}</p>{group.items.map(item => <button key={item.name} onClick={() => navigate(item.name)} className={`nav-item ${page === item.name ? 'active' : ''}`}><item.icon size={18}/><span>{item.name}</span>{item.name === 'Attendance' && <span className="nav-dot"/>}</button>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><ShieldCheck size={20}/></div><strong>Need a hand?</strong><p>Check the guide to get the most out of EduAttend.</p><button onClick={() => setNotice('Tip: use Students to manage records, Attendance to mark a date, and Reports to view percentages.')}>View help guide <span>→</span></button></div><div className="profile"><div className="avatar">SA</div><div className="profile-info"><strong>Shahil Ahammad</strong><small>Administrator</small></div><MoreHorizontal size={19}/></div></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(true)}><Menu/></button><div className="breadcrumb">Pages <span>/</span> <strong>{page}</strong></div><div className="top-actions"><div className={`connection ${apiOnline ? 'online' : 'offline'}`}><span/>{apiOnline ? 'Database connected' : 'Demo preview'}</div><button className="icon-button notification" aria-label="Notifications" onClick={() => setNotice(`${counts.unmarked} students are not marked for ${date}.`)}><Bell size={19}/><i/></button><div className="top-avatar">SA</div></div></header>
      <div className="content">
        <div className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> ACADEMIC YEAR 2026–27</div><h1>{page === 'Overview' ? 'Good morning, Shahil' : page}</h1><p>{page === 'Overview' ? 'Here’s what’s happening with your students today.' : page === 'Students' ? 'Manage your student directory and academic details.' : page === 'Attendance' ? 'Record and review daily student attendance.' : page === 'Reports' ? 'Review attendance trends and student performance.' : 'Manage your EduAttend workspace.'}</p></div><div className="welcome-actions"><button className="btn btn-light" onClick={exportCSV}><Download size={16}/> Export</button><button className="btn btn-primary" onClick={page === 'Attendance' ? saveAttendance : openAdd}><Plus size={17}/>{page === 'Attendance' ? 'Save attendance' : 'Add student'}</button></div></div>

        {notice && <div className="notice"><CheckCircle2 size={17}/><span>{notice}</span><button onClick={() => setNotice('')}><X size={16}/></button></div>}

        {page === 'Overview' && <>
          <div className="stats-grid">
            <StatCard title="Total Students" value={students.length} note="+8.2%" icon={Users} tone="blue" />
            <StatCard title="Present Today" value={counts.present} note={`${students.length ? Math.round(counts.present / students.length * 100) : 0}% of class`} icon={CheckCircle2} tone="green"/>
            <StatCard title="Absent Today" value={counts.absent} note={counts.absent ? 'Needs attention' : 'No absences'} icon={Clock3} tone="orange" trend="down"/>
            <StatCard title="Not Marked" value={counts.unmarked} note="Awaiting update" icon={Activity} tone="purple"/>
          </div>
          <div className="overview-grid">
            <section className="panel attendance-panel"><div className="panel-heading"><div><h2>Today's Attendance</h2><p>Attendance overview for your class</p></div><button className="select-date"><CalendarDays size={16}/><input aria-label="Attendance date" type="date" value={date} onChange={e => setDate(e.target.value)}/></button></div>
              <div className="attendance-summary"><div className="donut" style={{'--present': `${students.length ? counts.present / students.length * 100 : 0}%`}}><div><strong>{students.length ? Math.round(counts.present / students.length * 100) : 0}%</strong><small>Present</small></div></div><div className="legend"><div><i className="legend-green"/><span>Present</span><strong>{counts.present}</strong></div><div><i className="legend-orange"/><span>Absent</span><strong>{counts.absent}</strong></div><div><i className="legend-purple"/><span>On Leave</span><strong>{counts.leave}</strong></div><div><i className="legend-gray"/><span>Not marked</span><strong>{counts.unmarked}</strong></div></div></div>
              <div className="panel-footer"><span><span className="live-dot"/> Live summary for selected date</span><button onClick={() => navigate('Attendance')}>Mark attendance <span>→</span></button></div>
            </section>
            <section className="panel quick-panel"><div className="panel-heading"><div><h2>Quick Actions</h2><p>Shortcuts to common tasks</p></div><MoreHorizontal size={19}/></div><button className="quick-action" onClick={openAdd}><span className="quick-icon qi-blue"><UserRound size={19}/></span><span><strong>Add new student</strong><small>Register a student in your class</small></span><span className="quick-arrow">↗</span></button><button className="quick-action" onClick={() => navigate('Attendance')}><span className="quick-icon qi-green"><ClipboardCheck size={19}/></span><span><strong>Mark attendance</strong><small>Record today's class attendance</small></span><span className="quick-arrow">↗</span></button><button className="quick-action" onClick={() => navigate('Reports')}><span className="quick-icon qi-purple"><BarChart3 size={19}/></span><span><strong>View reports</strong><small>Explore attendance statistics</small></span><span className="quick-arrow">↗</span></button><button className="quick-action" onClick={exportCSV}><span className="quick-icon qi-orange"><Download size={19}/></span><span><strong>Export data</strong><small>Download the daily attendance CSV</small></span><span className="quick-arrow">↗</span></button></section>
          </div>
          <section className="panel table-panel"><div className="panel-heading"><div><h2>Recent Student Records</h2><p>Quick view of your student directory</p></div><button className="text-button" onClick={() => navigate('Students')}>View all students <span>→</span></button></div><StudentTable students={students.slice(0, 5)} attendance={attendance} onEdit={openEdit} onDelete={removeStudent}/></section>
        </>}

        {page === 'Students' && <section className="panel table-panel"><div className="panel-heading"><div><h2>Student Directory</h2><p>{students.length} student records in your directory</p></div><button className="btn btn-primary" onClick={openAdd}><Plus size={16}/> Add student</button></div><div className="table-tools"><div className="searchbox"><Search size={17}/><input placeholder="Search by name, roll number, email..." value={search} onChange={e => setSearch(e.target.value)}/></div><button className="btn btn-light" onClick={() => setSearch('')}><SlidersHorizontal size={16}/> Clear search</button></div><StudentTable students={filteredStudents} attendance={attendance} onEdit={openEdit} onDelete={removeStudent}/></section>}

        {page === 'Attendance' && <section className="panel table-panel"><div className="panel-heading"><div><h2>Daily Attendance</h2><p>Choose a status for each student, then save.</p></div><label className="select-date"><CalendarDays size={16}/><input aria-label="Choose attendance date" type="date" value={date} onChange={e => setDate(e.target.value)}/></label></div><div className="attendance-toolbar"><span>{counts.present} present · {counts.absent} absent · {counts.leave} on leave</span><button className="btn btn-light" onClick={() => setAttendance(prev => Object.fromEntries(students.map(s => [s.id, prev[s.id] || 'Present'])))}>Mark all present</button></div><div className="attendance-list">{filteredStudents.map((s, i) => <div className="attendance-row" key={s.id}><div className="student-main"><div className={`student-avatar avatar-${i % 5}`}>{s.full_name.split(' ').map(n => n[0]).slice(0,2).join('')}</div><div><strong>{s.full_name}</strong><small>{s.roll_no} · {s.course}</small></div></div><div className="status-choices">{['Present','Absent','On Leave'].map(status => <button key={status} className={`status-choice ${status.toLowerCase().replace(' ','-')} ${attendance[s.id] === status ? 'chosen' : ''}`} onClick={() => setStatus(s.id, status)}>{attendance[s.id] === status && <Check size={14}/>} {status}</button>)}</div></div>)}</div><div className="save-row"><span>{counts.unmarked} students still unmarked</span><button className="btn btn-primary" onClick={saveAttendance}><Check size={16}/> Save attendance</button></div></section>}

        {page === 'Reports' && <><div className="stats-grid"><StatCard title="Total Students" value={students.length} note="In directory" icon={Users} tone="blue"/><StatCard title="Average Attendance" value={`${students.length ? Math.round(students.reduce((n,s) => n + Number(s.percentage || 0), 0) / students.length) : 0}%`} note="Across all records" icon={BarChart3} tone="green"/><StatCard title="Below 75%" value={students.filter(s => s.total_sessions && Number(s.percentage) < 75).length} note="Needs follow-up" icon={Activity} tone="orange" trend="down"/><StatCard title="Sessions Recorded" value={students.reduce((n,s) => n + Number(s.total_sessions || 0), 0)} note="Present + absent" icon={CalendarDays} tone="purple"/></div><section className="panel table-panel"><div className="panel-heading"><div><h2>Attendance Performance</h2><p>Overall attendance percentages by student</p></div><button className="btn btn-light" onClick={exportCSV}><Download size={16}/> Export CSV</button></div><div className="table-wrap"><table><thead><tr><th>STUDENT</th><th>SESSIONS</th><th>PRESENT</th><th>ABSENT</th><th>ATTENDANCE</th></tr></thead><tbody>{students.map((s,i) => { const total = Number(s.total_sessions || 0), present = Number(s.present || 0), absent = Number(s.absent || 0), pct = Number(s.percentage || 0); return <tr key={s.id}><td><div className="student-cell"><div className={`student-avatar avatar-${i%5}`}>{s.full_name.split(' ').map(n=>n[0]).slice(0,2).join('')}</div><div><strong>{s.full_name}</strong><small>{s.roll_no}</small></div></div></td><td>{total}</td><td>{present}</td><td>{absent}</td><td><div className="percentage-cell"><div className="progress"><i style={{width:`${pct}%`}}/></div><strong className={pct < 75 ? 'low-pct' : ''}>{pct}%</strong></div></td></tr>; })}</tbody></table>{!students.length && <div className="empty-state">No report data yet. Add students and record attendance first.</div>}</div></section></>}

        {(page === 'Settings' || page === 'Help & Support') && <section className="panel settings-panel"><div className="settings-icon"><Settings size={24}/></div><h2>{page === 'Settings' ? 'Workspace Settings' : 'Help & Support'}</h2><p>{page === 'Settings' ? 'This student project uses a local PostgreSQL database. Configure the connection in backend/.env.' : 'Use the sidebar to navigate. Add students first, then record attendance for a selected date and review Reports.'}</p><div className="settings-detail"><strong>Application</strong><span>EduAttend Pro</span></div><div className="settings-detail"><strong>API status</strong><span className={apiOnline ? 'good-text' : 'muted'}>{apiOnline ? 'Connected' : 'Demo preview / API offline'}</span></div><div className="settings-detail"><strong>Database</strong><span>PostgreSQL</span></div></section>}

        <footer className="footer"><span>© 2026 EduAttend Pro. Built for academic excellence.</span><span><span className="footer-dot"/> All systems {apiOnline ? 'operational' : 'ready for setup'}</span></footer>
      </div>
    </main>

    {modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(false); }}><form className="modal" onSubmit={saveStudent}><div className="modal-head"><div><h2>{editing ? 'Edit student' : 'Add new student'}</h2><p>Enter the student's academic details below.</p></div><button type="button" className="icon-button" onClick={() => setModal(false)}><X size={18}/></button></div><label>Full name<input required value={form.full_name} onChange={e => setForm({...form, full_name:e.target.value})} placeholder="e.g. Aisha Mohammed"/></label><div className="form-grid"><label>Roll number<input required value={form.roll_no} onChange={e => setForm({...form, roll_no:e.target.value})} placeholder="e.g. KA2406"/></label><label>Email address<input required type="email" value={form.email} onChange={e => setForm({...form, email:e.target.value})} placeholder="student@example.com"/></label></div><div className="form-grid"><label>Course<input required value={form.course} onChange={e => setForm({...form, course:e.target.value})}/></label><label>Semester<select value={form.semester} onChange={e => setForm({...form, semester:Number(e.target.value)})}>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>Semester {i+1}</option>)}</select></label></div><div className="modal-actions"><button type="button" className="btn btn-light" onClick={() => setModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editing ? 'Save changes' : 'Add student'}</button></div></form></div>}
  </div>;
}

function StudentTable({ students, attendance, onEdit, onDelete }) {
  return <div className="table-wrap"><table><thead><tr><th>STUDENT</th><th>ROLL NUMBER</th><th>COURSE</th><th>STATUS TODAY</th><th>ACTIONS</th></tr></thead><tbody>{students.map((s,i) => <tr key={s.id}><td><div className="student-cell"><div className={`student-avatar avatar-${i%5}`}>{s.full_name.split(' ').map(n=>n[0]).slice(0,2).join('')}</div><div><strong>{s.full_name}</strong><small>{s.email || 'No email added'}</small></div></div></td><td><span className="roll-pill">{s.roll_no}</span></td><td><span>{s.course || 'Computer Science'}</span><small className="subline">Semester {s.semester || 1}</small></td><td><span className={`status-pill ${attendance[s.id] ? attendance[s.id].toLowerCase().replace(' ','-') : 'unmarked'}`}><i/>{attendance[s.id] || 'Not marked'}</span></td><td><div className="row-actions"><button title="Edit student" onClick={() => onEdit(s)}><Pencil size={16}/></button><button title="Delete student" onClick={() => onDelete(s)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table>{!students.length && <div className="empty-state"><Users size={25}/><strong>No students found</strong><span>Add a student or adjust your search.</span></div>}</div>;
}

export default App;

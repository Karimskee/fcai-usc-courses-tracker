'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, LogOut } from 'lucide-react';

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [data, setData] = useState(null);
  const [fileSha, setFileSha] = useState('');
  const [faculty, setFaculty] = useState('USC');
  const [view, setView] = useState('mandatory'); // mandatory, elective
  const [dept, setDept] = useState('CS');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const savedToken = sessionStorage.getItem('gh_token');
    const savedOwner = sessionStorage.getItem('gh_owner');
    const savedRepo = sessionStorage.getItem('gh_repo');
    if (savedToken && savedOwner && savedRepo) {
      setToken(savedToken);
      setOwner(savedOwner);
      setRepo(savedRepo);
      setIsAuthenticated(true);
      fetchData(faculty, savedToken, savedOwner, savedRepo);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Invalid credentials or missing permissions.');
      
      sessionStorage.setItem('gh_token', token);
      sessionStorage.setItem('gh_owner', owner);
      sessionStorage.setItem('gh_repo', repo);
      setIsAuthenticated(true);
      fetchData(faculty, token, owner, repo);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    setIsAuthenticated(false);
    setData(null);
  };

  const fetchData = async (fac, t = token, o = owner, r = repo) => {
    setLoading(true);
    try {
      const path = `data/${fac.toLowerCase()}_courses.json`;
      const res = await fetch(`https://api.github.com/repos/${o}/${r}/contents/${path}`, {
        headers: { Authorization: `Bearer ${t}`, Accept: 'application/vnd.github.v3+json' }
      });
      if (!res.ok) throw new Error(`Failed to load ${path}`);
      
      const resData = await res.json();
      setFileSha(resData.sha);
      
      // Fix for decoding unicode properly from base64
      const b64 = resData.content.replace(/\s/g, '');
      const str = decodeURIComponent(escape(atob(b64)));
      const parsed = JSON.parse(str);
      
      setData(parsed);
      setDept(Object.keys(parsed.departments)[0]);
      setIsDirty(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFacultyChange = (f) => {
    setFaculty(f);
    fetchData(f);
  };

  const handleSave = async () => {
    if (!isDirty) return;
    setLoading(true);
    try {
      const path = `data/${faculty.toLowerCase()}_courses.json`;
      const jsonStr = JSON.stringify(data, null, 2);
      const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
      
      const payload = {
        message: `Admin Panel: Update ${faculty} data`,
        content: b64,
        sha: fileSha
      };
      
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Failed to commit changes.');
      
      const resData = await res.json();
      setFileSha(resData.content.sha);
      setIsDirty(false);
      alert('Changes published successfully!');
    } catch (err) {
      alert(`Error publishing: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        <form onSubmit={handleLogin} className="glass-panel auth-box">
          <h2>Admin Authentication</h2>
          <p>Requires a GitHub PAT with repo access.</p>
          
          <input type="text" placeholder="GitHub Owner (e.g., Karimskee)" required value={owner} onChange={e => setOwner(e.target.value)} />
          <input type="text" placeholder="Repository Name" required value={repo} onChange={e => setRepo(e.target.value)} />
          <input type="password" placeholder="ghp_..." required value={token} onChange={e => setToken(e.target.value)} />
          
          {error && <div className="error">{error}</div>}
          
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </form>
        <style jsx>{`
          .auth-container { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: var(--bg-color); }
          .auth-box { padding: 40px; border-radius: 16px; display: flex; flex-direction: column; gap: 16px; width: 400px; }
          h2 { font-size: 20px; font-weight: 600; }
          p { font-size: 14px; color: var(--text-secondary); margin-bottom: 16px; }
          input { background: var(--bg-color); border: 1px solid var(--border-color); color: white; padding: 12px; border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.2s; }
          input:focus { border-color: var(--text-secondary); }
          .error { color: #ef4444; font-size: 13px; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <aside className="sidebar glass-panel">
        <div className="sidebar-header">
          <h3>FCAI Admin</h3>
          <button className="btn-icon" onClick={handleLogout} title="Logout"><LogOut size={16} /></button>
        </div>
        
        <select className="dark-select" value={faculty} onChange={e => handleFacultyChange(e.target.value)}>
          <option value="USC">FCAI USC</option>
          <option value="NUSC">FCAI NUSC</option>
        </select>
        
        <div className="nav-section">
          <h4>Departments</h4>
          {data && Object.keys(data.departments).map(d => (
            <button key={d} className={`nav-item ${dept === d ? 'active' : ''}`} onClick={() => setDept(d)}>
              {data.departments[d].name_en}
            </button>
          ))}
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="tabs">
            <button className={`tab ${view === 'mandatory' ? 'active' : ''}`} onClick={() => setView('mandatory')}>Mandatory Courses</button>
            <button className={`tab ${view === 'elective' ? 'active' : ''}`} onClick={() => setView('elective')}>Elective Courses</button>
          </div>
          
          <button className="btn" onClick={handleSave} disabled={!isDirty || loading} style={{ opacity: isDirty ? 1 : 0.5 }}>
            <Save size={18} /> {loading ? 'Saving...' : 'Publish to GitHub'}
          </button>
        </header>

        {data && <NotionTable 
          courses={data.departments[dept][view]} 
          onUpdate={(newCourses) => {
            const newData = { ...data };
            newData.departments[dept][view] = newCourses;
            setData(newData);
            setIsDirty(true);
          }}
        />}
      </main>

      <style jsx>{`
        .admin-layout { display: flex; height: 100vh; background: var(--bg-color); }
        .sidebar { width: 260px; display: flex; flex-direction: column; gap: 24px; padding: 24px; border-right: 1px solid var(--border-color); border-radius: 0; }
        .sidebar-header { display: flex; justify-content: space-between; align-items: center; }
        .sidebar-header h3 { font-size: 16px; font-weight: 600; }
        .btn-icon { background: transparent; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px; border-radius: 4px; }
        .btn-icon:hover { background: rgba(255,255,255,0.1); color: white; }
        .dark-select { background: var(--bg-tertiary); color: white; border: 1px solid var(--border-color); padding: 8px 12px; border-radius: 8px; outline: none; }
        .nav-section { display: flex; flex-direction: column; gap: 8px; }
        .nav-section h4 { font-size: 12px; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.5px; margin-bottom: 4px; }
        .nav-item { background: transparent; border: none; color: var(--text-secondary); text-align: left; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 14px; transition: background 0.2s; }
        .nav-item:hover { background: rgba(255,255,255,0.05); }
        .nav-item.active { background: rgba(255,255,255,0.1); color: white; font-weight: 500; }
        
        .main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .topbar { display: flex; justify-content: space-between; align-items: center; padding: 24px 32px; border-bottom: 1px solid var(--border-color); }
        .tabs { display: flex; gap: 16px; }
        .tab { background: transparent; border: none; color: var(--text-secondary); font-size: 15px; font-weight: 500; cursor: pointer; padding-bottom: 4px; border-bottom: 2px solid transparent; transition: all 0.2s; }
        .tab:hover { color: white; }
        .tab.active { color: white; border-bottom-color: white; }
      `}</style>
    </div>
  );
}

function NotionTable({ courses, onUpdate }) {
  const updateCourse = (index, field, value) => {
    const updated = [...courses];
    if (field === 'hours') value = parseInt(value) || 0;
    if (field === 'prereq' || field === 'expected_doctors') {
      value = value.split(',').map(s => s.trim()).filter(s => s);
    }
    updated[index] = { ...updated[index], [field]: value };
    onUpdate(updated);
  };

  const addRow = () => {
    const newCourse = {
      code: 'NEW_CODE',
      name_en: 'New Course',
      name_ar: 'مقرر جديد',
      hours: 3,
      prereq: [],
      expected_doctors: []
    };
    onUpdate([...courses, newCourse]);
  };

  const deleteRow = (index) => {
    const updated = courses.filter((_, i) => i !== index);
    onUpdate(updated);
  };

  return (
    <div className="table-container">
      <table className="notion-table">
        <thead>
          <tr>
            <th style={{ width: '100px' }}>Code</th>
            <th style={{ width: '250px' }}>Name (EN)</th>
            <th style={{ width: '250px' }}>Name (AR)</th>
            <th style={{ width: '80px' }}>Hours</th>
            <th>Prerequisites</th>
            <th>Expected Doctors</th>
            <th style={{ width: '50px' }}></th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course, i) => (
            <tr key={i}>
              <td><input value={course.code} onChange={e => updateCourse(i, 'code', e.target.value)} /></td>
              <td><input value={course.name_en} onChange={e => updateCourse(i, 'name_en', e.target.value)} /></td>
              <td><input value={course.name_ar} onChange={e => updateCourse(i, 'name_ar', e.target.value)} dir="rtl" /></td>
              <td><input type="number" value={course.hours} onChange={e => updateCourse(i, 'hours', e.target.value)} /></td>
              <td><input value={(course.prereq || []).join(', ')} onChange={e => updateCourse(i, 'prereq', e.target.value)} placeholder="CS101, MA102" /></td>
              <td><input value={(course.expected_doctors || []).join(', ')} onChange={e => updateCourse(i, 'expected_doctors', e.target.value)} placeholder="Dr. Ahmed" /></td>
              <td><button className="delete-btn" onClick={() => deleteRow(i)}><Trash2 size={14} /></button></td>
            </tr>
          ))}
          <tr>
            <td colSpan={7} className="add-row">
              <button onClick={addRow}><Plus size={16} /> New Course</button>
            </td>
          </tr>
        </tbody>
      </table>

      <style jsx>{`
        .table-container { flex: 1; overflow: auto; padding: 32px; }
        .notion-table { width: 100%; border-collapse: collapse; text-align: left; }
        th { font-size: 12px; font-weight: 500; color: var(--text-secondary); border-bottom: 1px solid var(--border-color); padding: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { border-bottom: 1px solid rgba(255,255,255,0.05); padding: 0; position: relative; }
        td:focus-within { outline: 1px solid var(--accent-green); z-index: 1; }
        input { width: 100%; height: 100%; padding: 12px; background: transparent; border: none; color: white; font-size: 14px; outline: none; font-family: inherit; }
        input:hover { background: rgba(255,255,255,0.02); }
        .delete-btn { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: transparent; border: none; color: var(--text-secondary); cursor: pointer; opacity: 0; transition: opacity 0.2s; }
        tr:hover .delete-btn { opacity: 1; }
        .delete-btn:hover { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
        .add-row button { width: 100%; display: flex; align-items: center; gap: 8px; padding: 12px; background: transparent; border: none; color: var(--text-secondary); font-size: 14px; cursor: pointer; transition: color 0.2s; }
        .add-row button:hover { color: white; background: rgba(255,255,255,0.02); }
      `}</style>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, LogOut, ChevronRight, Folder, BookOpen, Edit2, Check, X } from 'lucide-react';
import { saveFacultyLocal, deleteFacultyLocal } from '../actions';

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // State
  const [faculties, setFaculties] = useState([]); // List of file objects
  const [selectedFaculty, setSelectedFaculty] = useState(null); // The loaded JSON
  const [selectedFacultyFile, setSelectedFacultyFile] = useState(null); // The file metadata (sha, path)
  
  const [selectedDeptKey, setSelectedDeptKey] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const t = sessionStorage.getItem('gh_token');
    const o = sessionStorage.getItem('gh_owner');
    const r = sessionStorage.getItem('gh_repo');
    if (t && o && r) {
      setToken(t); setOwner(o); setRepo(r);
      setIsAuthenticated(true);
      fetchFaculties(t, o, r);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Invalid credentials');
      sessionStorage.setItem('gh_token', token);
      sessionStorage.setItem('gh_owner', owner);
      sessionStorage.setItem('gh_repo', repo);
      setIsAuthenticated(true);
      fetchFaculties(token, owner, repo);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    setIsAuthenticated(false);
  };

  const fetchFaculties = async (t, o, r) => {
    setLoading(true);
    try {
      const res = await fetch(`https://api.github.com/repos/${o}/${r}/contents/data`, {
        headers: { Authorization: `Bearer ${t}`, Accept: 'application/vnd.github.v3+json' },
        cache: 'no-store'
      });
      if (!res.ok) throw new Error('Failed to load data folder');
      const files = await res.json();
      const facFiles = files.filter(f => f.name.endsWith('_courses.json'));
      setFaculties(facFiles);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFaculty = async (file) => {
    if (isDirty && !confirm("Unsaved changes will be lost. Continue?")) return;
    setLoading(true);
    try {
      const res = await fetch(file.url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
        cache: 'no-store'
      });
      const resData = await res.json();
      const b64 = resData.content.replace(/\s/g, '');
      const str = decodeURIComponent(escape(atob(b64)));
      setSelectedFaculty(JSON.parse(str));
      setSelectedFacultyFile({ path: file.path, sha: resData.sha });
      setSelectedDeptKey(null);
      setSelectedSemester(null);
      setIsDirty(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isDirty || !selectedFacultyFile) return;
    setLoading(true);
    try {
      const dataToSave = JSON.parse(JSON.stringify(selectedFaculty));
      // Sanitize arrays before saving
      Object.values(dataToSave.departments).forEach(dept => {
        Object.values(dept.semesters || {}).forEach(sem => {
          sem.forEach(c => {
            if (c.prereq) c.prereq = c.prereq.map(s => s.trim()).filter(s => s);
            if (c.expected_doctors) c.expected_doctors = c.expected_doctors.map(s => s.trim()).filter(s => s);
          });
        });
      });
      
      const jsonStr = JSON.stringify(dataToSave, null, 2);
      const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
      
      const payload = {
        message: `Admin Panel: Update ${selectedFacultyFile.path}`,
        content: b64,
        sha: selectedFacultyFile.sha
      };
      
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${selectedFacultyFile.path}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Failed to commit changes.');
      const resData = await res.json();
      
      await saveFacultyLocal(selectedFacultyFile.path.replace('data/', ''), jsonStr);
      
      setSelectedFacultyFile({ ...selectedFacultyFile, sha: resData.content.sha });
      setIsDirty(false);
      
      // Crucially, refetch the faculties list so the main list gets the new SHA!
      // Otherwise, deleting this faculty later in the same session will fail due to SHA mismatch.
      await fetchFaculties(token, owner, repo);
      
      alert('Changes published successfully!');
    } catch (err) {
      alert(`Error publishing: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // FACULTY CRUD
  const addFaculty = async () => {
    const name = prompt("Enter new faculty ID (e.g. 'alex' for alex_courses.json):");
    if (!name) return;
    const path = `data/${name.toLowerCase()}_courses.json`;
    const initialData = {
      meta: { faculty: name.toUpperCase(), departments: [] },
      departments: {}
    };
    
    setLoading(true);
    try {
      const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(initialData, null, 2))));
      const payload = { message: `Create ${path}`, content: b64 };
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to create file');
      
      await saveFacultyLocal(`${name.toLowerCase()}_courses.json`, JSON.stringify(initialData, null, 2));
      
      await fetchFaculties(token, owner, repo);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteFaculty = async (file) => {
    if (!confirm(`Are you sure you want to permanently delete ${file.name}?`)) return;
    setLoading(true);
    try {
      const payload = { message: `Delete ${file.path}`, sha: file.sha };
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to delete');
      
      await deleteFacultyLocal(file.path.replace('data/', ''));
      
      if (selectedFacultyFile?.path === file.path) {
        setSelectedFaculty(null); setSelectedFacultyFile(null);
      }
      await fetchFaculties(token, owner, repo);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // DEPT CRUD
  const addDept = () => {
    const code = prompt("Enter Department Code (e.g. 'SE'):");
    if (!code || selectedFaculty.departments[code]) return;
    const name = prompt("Enter Department Full Name:");
    
    const newData = { ...selectedFaculty };
    newData.departments[code] = {
      name_en: name || code,
      name_ar: name || code,
      semesters: {
        level_1_sem_1: [], level_1_sem_2: [],
        level_2_sem_1: [], level_2_sem_2: [],
        level_3_sem_1: [], level_3_sem_2: [],
        level_4_sem_1: [], level_4_sem_2: []
      }
    };
    if (!newData.meta.departments) newData.meta.departments = [];
    if (!newData.meta.departments.includes(code)) newData.meta.departments.push(code);
    
    setSelectedFaculty(newData);
    setIsDirty(true);
  };

  const deleteDept = (code) => {
    if (!confirm(`Delete department ${code}?`)) return;
    const newData = { ...selectedFaculty };
    delete newData.departments[code];
    newData.meta.departments = newData.meta.departments.filter(c => c !== code);
    setSelectedFaculty(newData);
    setIsDirty(true);
    if (selectedDeptKey === code) setSelectedDeptKey(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        <form onSubmit={handleLogin} className="glass-panel auth-box">
          <h2>Admin Authentication</h2>
          <p>Requires a GitHub PAT with repo access.</p>
          <input type="text" placeholder="GitHub Owner" required value={owner} onChange={e => setOwner(e.target.value)} />
          <input type="text" placeholder="Repository Name" required value={repo} onChange={e => setRepo(e.target.value)} />
          <input type="password" placeholder="ghp_..." required value={token} onChange={e => setToken(e.target.value)} />
          {error && <div className="error">{error}</div>}
          <button type="submit" className="btn" disabled={loading}>{loading ? 'Verifying...' : 'Login'}</button>
        </form>
        <style jsx>{`
          .auth-container { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: var(--bg-color); }
          .auth-box { padding: 40px; border-radius: 16px; display: flex; flex-direction: column; gap: 16px; width: 400px; }
          h2 { font-size: 20px; font-weight: 600; }
          p { font-size: 14px; color: var(--text-secondary); margin-bottom: 16px; }
          input { background: var(--bg-color); border: 1px solid var(--border-color); color: white; padding: 12px; border-radius: 8px; font-size: 14px; outline: none; }
          input:focus { border-color: var(--text-secondary); }
          .error { color: #ef4444; font-size: 13px; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* HEADER BREADCRUMBS */}
      <header className="topbar">
        <div className="breadcrumbs">
          <button onClick={() => { setSelectedFaculty(null); setSelectedDeptKey(null); }}>Admin</button>
          {selectedFaculty && (
            <>
              <ChevronRight size={14} />
              <button onClick={() => { setSelectedDeptKey(null); setSelectedSemester(null); }}>{selectedFaculty.meta.faculty}</button>
            </>
          )}
          {selectedDeptKey && (
            <>
              <ChevronRight size={14} />
              <button onClick={() => setSelectedSemester(null)}>{selectedDeptKey}</button>
            </>
          )}
          {selectedSemester && (
            <>
              <ChevronRight size={14} />
              <span>{selectedSemester.replace(/_/g, ' ').toUpperCase()}</span>
            </>
          )}
        </div>
        
        <div className="actions">
          {isDirty && <span className="dirty-badge">Unsaved Changes</span>}
          <button className="btn" onClick={handleSave} disabled={!isDirty || loading} style={{ opacity: isDirty ? 1 : 0.5 }}>
            <Save size={16} /> {loading ? 'Saving...' : 'Publish to GitHub'}
          </button>
          <button className="btn-icon" onClick={handleLogout} title="Logout"><LogOut size={16} /></button>
        </div>
      </header>

      <main className="content">
        {/* VIEW 1: FACULTIES */}
        {!selectedFaculty && (
          <div className="view-grid">
            <h2>Faculties</h2>
            <div className="card-grid">
              {faculties.map(f => (
                <div key={f.sha} className="card glass-panel">
                  <div className="card-content" onClick={() => loadFaculty(f)}>
                    <Folder size={24} className="icon" />
                    <h3>{f.name.replace('_courses.json', '').toUpperCase()}</h3>
                    <p>{f.path}</p>
                  </div>
                  <button className="delete-btn" onClick={(e) => { e.stopPropagation(); deleteFaculty(f); }}><Trash2 size={16} /></button>
                </div>
              ))}
              <div className="card glass-panel add-card" onClick={addFaculty}>
                <Plus size={24} />
                <h3>Add Faculty</h3>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: DEPARTMENTS */}
        {selectedFaculty && !selectedDeptKey && (
          <div className="view-grid">
            <h2>Departments in {selectedFaculty.meta.faculty}</h2>
            <div className="card-grid">
              {Object.keys(selectedFaculty.departments).map(d => (
                <div key={d} className="card glass-panel">
                  <div className="card-content" onClick={() => {
                    setSelectedDeptKey(d);
                    const sems = Object.keys(selectedFaculty.departments[d].semesters || {});
                    if (sems.length > 0) setSelectedSemester(sems[0]);
                  }}>
                    <BookOpen size={24} className="icon" />
                    <h3>{d}</h3>
                    <p>{selectedFaculty.departments[d].name_en}</p>
                  </div>
                  <button className="delete-btn" onClick={(e) => { e.stopPropagation(); deleteDept(d); }}><Trash2 size={16} /></button>
                </div>
              ))}
              <div className="card glass-panel add-card" onClick={addDept}>
                <Plus size={24} />
                <h3>Add Department</h3>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: COURSES (Grouped by Semester) */}
        {selectedFaculty && selectedDeptKey && (
          <div className="courses-view">
            <div className="semester-tabs">
              {Object.keys(selectedFaculty.departments[selectedDeptKey].semesters || {}).map(sem => (
                <button 
                  key={sem} 
                  className={`sem-tab ${selectedSemester === sem ? 'active' : ''}`}
                  onClick={() => setSelectedSemester(sem)}
                >
                  {sem.replace(/_/g, ' ').toUpperCase()}
                </button>
              ))}
              <button className="sem-tab add" onClick={() => {
                const s = prompt("Semester key (e.g. level_5_sem_1):");
                if(s) {
                  const newData = {...selectedFaculty};
                  newData.departments[selectedDeptKey].semesters[s] = [];
                  setSelectedFaculty(newData); setIsDirty(true);
                }
              }}><Plus size={14}/> Add Sem</button>
            </div>
            
            {selectedSemester && (
              <CoursesTable 
                courses={selectedFaculty.departments[selectedDeptKey].semesters[selectedSemester]}
                onUpdate={(newCourses) => {
                  const newData = {...selectedFaculty};
                  newData.departments[selectedDeptKey].semesters[selectedSemester] = newCourses;
                  setSelectedFaculty(newData);
                  setIsDirty(true);
                }}
              />
            )}
            {!selectedSemester && (
              <div className="empty-state">Select a semester to manage its courses.</div>
            )}
          </div>
        )}
      </main>

      <style jsx>{`
        .admin-layout { display: flex; flex-direction: column; height: 100vh; background: var(--bg-color); }
        .topbar { display: flex; justify-content: space-between; align-items: center; padding: 16px 32px; border-bottom: 1px solid var(--border-color); background: var(--bg-secondary); }
        .breadcrumbs { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; }
        .breadcrumbs button { background: transparent; border: none; color: var(--text-secondary); cursor: pointer; transition: color 0.2s; }
        .breadcrumbs button:hover { color: white; }
        .breadcrumbs span { color: white; }
        .actions { display: flex; align-items: center; gap: 16px; }
        .dirty-badge { font-size: 12px; color: #fbbf24; background: rgba(251, 191, 36, 0.1); padding: 4px 8px; border-radius: 4px; }
        
        .content { flex: 1; overflow: auto; padding: 32px; }
        .view-grid h2 { margin-bottom: 24px; font-size: 24px; font-weight: 600; }
        .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 24px; }
        .card { border-radius: 12px; position: relative; overflow: hidden; transition: transform 0.2s; }
        .card:hover { transform: translateY(-2px); }
        .card-content { padding: 24px; cursor: pointer; display: flex; flex-direction: column; gap: 8px; }
        .card .icon { color: var(--accent-green); margin-bottom: 8px; }
        .card h3 { font-size: 18px; font-weight: 600; }
        .card p { font-size: 13px; color: var(--text-secondary); }
        .delete-btn { position: absolute; top: 12px; right: 12px; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: none; padding: 6px; border-radius: 6px; cursor: pointer; opacity: 0; transition: all 0.2s; }
        .card:hover .delete-btn { opacity: 1; }
        .delete-btn:hover { background: #ef4444; color: white; }
        .add-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; cursor: pointer; color: var(--text-secondary); border: 2px dashed var(--border-color); background: transparent; min-height: 140px; }
        .add-card:hover { color: white; border-color: var(--text-secondary); }
        
        .courses-view { display: flex; flex-direction: column; height: 100%; gap: 24px; }
        .semester-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
        .sem-tab { background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-secondary); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s; display: flex; align-items: center; gap: 6px;}
        .sem-tab:hover { background: rgba(255,255,255,0.1); color: white; }
        .sem-tab.active { background: var(--accent-green); color: black; border-color: var(--accent-green); }
        .sem-tab.add { border-style: dashed; }
        .empty-state { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); font-size: 15px; }
      `}</style>
    </div>
  );
}

function CoursesTable({ courses, onUpdate }) {
  const updateCourse = (index, field, value) => {
    const updated = [...courses];
    if (field === 'hours') value = parseInt(value) || 0;
    if (field === 'prereq') value = value === '' ? [] : value.split(',');
    if (field === 'expected_doctors') value = value === '' ? [] : value.split(',');
    updated[index] = { ...updated[index], [field]: value };
    onUpdate(updated);
  };

  const addRow = () => {
    onUpdate([...courses, { code: 'NEW_CODE', name_en: 'New Course', name_ar: 'مقرر جديد', hours: 3, prereq: [], expected_doctors: [], type: 'mandatory', category: 'department' }]);
  };

  const deleteRow = (index) => {
    onUpdate(courses.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e, rowIndex, field) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const direction = e.shiftKey ? -1 : 1;
      const nextRow = rowIndex + direction;
      const nextElement = document.getElementById(`input-${nextRow}-${field}`);
      if (nextElement) {
        nextElement.focus();
        if (nextElement.select) nextElement.select(); // Select text if it's an input
      }
    }
  };

  return (
    <div className="table-container glass-panel">
      <table className="notion-table">
        <thead>
          <tr>
            <th style={{ width: '100px' }}>Code</th>
            <th style={{ width: '200px' }}>Name (EN)</th>
            <th style={{ width: '200px' }}>Name (AR)</th>
            <th style={{ width: '60px' }}>Hours</th>
            <th style={{ width: '100px' }}>Type</th>
            <th style={{ width: '100px' }}>Category</th>
            <th style={{ width: '150px' }}>Prerequisites</th>
            <th>Expected Doctors</th>
            <th style={{ width: '40px' }}></th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course, i) => (
            <tr key={i}>
              <td><input id={`input-${i}-code`} value={course.code} onChange={e => updateCourse(i, 'code', e.target.value)} onKeyDown={e => handleKeyDown(e, i, 'code')} /></td>
              <td><input id={`input-${i}-name_en`} value={course.name_en} onChange={e => updateCourse(i, 'name_en', e.target.value)} onKeyDown={e => handleKeyDown(e, i, 'name_en')} /></td>
              <td><input id={`input-${i}-name_ar`} value={course.name_ar} onChange={e => updateCourse(i, 'name_ar', e.target.value)} dir="rtl" onKeyDown={e => handleKeyDown(e, i, 'name_ar')} /></td>
              <td><input id={`input-${i}-hours`} type="number" value={course.hours} onChange={e => updateCourse(i, 'hours', e.target.value)} onKeyDown={e => handleKeyDown(e, i, 'hours')} /></td>
              <td>
                <select id={`input-${i}-type`} value={course.type || 'mandatory'} onChange={e => updateCourse(i, 'type', e.target.value)} onKeyDown={e => handleKeyDown(e, i, 'type')}>
                  <option value="mandatory">Mandatory</option>
                  <option value="elective">Elective</option>
                </select>
              </td>
              <td>
                <select id={`input-${i}-category`} value={course.category || 'department'} onChange={e => updateCourse(i, 'category', e.target.value)} onKeyDown={e => handleKeyDown(e, i, 'category')}>
                  <option value="department">Department</option>
                  <option value="faculty">Faculty</option>
                  <option value="general">General</option>
                </select>
              </td>
              <td><input id={`input-${i}-prereq`} value={(course.prereq || []).join(',')} onChange={e => updateCourse(i, 'prereq', e.target.value)} placeholder="CS101,MA102" onKeyDown={e => handleKeyDown(e, i, 'prereq')} /></td>
              <td><input id={`input-${i}-expected_doctors`} value={(course.expected_doctors || []).join(',')} onChange={e => updateCourse(i, 'expected_doctors', e.target.value)} placeholder="Dr. Ahmed,Dr. Ali" onKeyDown={e => handleKeyDown(e, i, 'expected_doctors')} /></td>
              <td><button className="delete-btn" onClick={() => deleteRow(i)}><Trash2 size={14} /></button></td>
            </tr>
          ))}
          <tr>
            <td colSpan={8} className="add-row">
              <button onClick={addRow}><Plus size={16} /> New Course</button>
            </td>
          </tr>
        </tbody>
      </table>

      <style jsx>{`
        .table-container { flex: 1; overflow: auto; border-radius: 12px; }
        .notion-table { width: 100%; border-collapse: collapse; text-align: left; }
        th { font-size: 11px; font-weight: 600; color: var(--text-secondary); border-bottom: 1px solid var(--border-color); padding: 12px 16px; text-transform: uppercase; letter-spacing: 0.5px; position: sticky; top: 0; background: rgba(20,20,20,0.9); backdrop-filter: blur(8px); z-index: 10; }
        td { border-bottom: 1px solid rgba(255,255,255,0.05); padding: 0; position: relative; }
        td:focus-within { outline: 1px solid var(--accent-green); z-index: 1; }
        input, select { width: 100%; height: 100%; padding: 12px 16px; background: transparent; border: none; color: white; font-size: 13px; outline: none; font-family: inherit; }
        select { appearance: none; cursor: pointer; color: var(--text-secondary); }
        select:focus { color: white; }
        option { background: var(--bg-color); color: white; }
        input:hover, select:hover { background: rgba(255,255,255,0.02); }
        .delete-btn { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: transparent; border: none; color: var(--text-secondary); cursor: pointer; opacity: 0; transition: opacity 0.2s; }
        tr:hover .delete-btn { opacity: 1; }
        .delete-btn:hover { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
        .add-row button { width: 100%; display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: transparent; border: none; color: var(--text-secondary); font-size: 13px; cursor: pointer; transition: color 0.2s; }
        .add-row button:hover { color: white; background: rgba(255,255,255,0.02); }
      `}</style>
    </div>
  );
}

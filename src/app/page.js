'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Network } from 'lucide-react';
import uscData from '../../data/usc_courses.json';
import nuscData from '../../data/nusc_courses.json';

const FACULTIES = {
  USC: uscData,
  NUSC: nuscData,
};

export default function LandingPage() {
  const router = useRouter();
  
  const [faculty, setFaculty] = useState('USC');
  const [department, setDepartment] = useState('');
  
  const departments = Object.entries(FACULTIES[faculty].departments).map(([key, data]) => ({
    id: key,
    name: data.name_en,
  }));

  // Auto-select first department when faculty changes
  useEffect(() => {
    if (departments.length > 0) {
      setDepartment(departments[0].id);
    }
  }, [faculty]);

  const handleStart = () => {
    if (!faculty || !department) return;
    
    // Save selection to localStorage so the flow page can read it
    localStorage.setItem('fcai_tracker_faculty', faculty);
    localStorage.setItem('fcai_tracker_department', department);
    
    router.push('/flow');
  };

  return (
    <div className="landing-container">
      <div className="landing-content glass-panel">
        <div className="logo-container">
          <Network size={48} strokeWidth={1.5} className="logo-icon" />
          <h1>FCAI Course Tracker</h1>
          <p>Interactive curriculum visualization</p>
        </div>

        <div className="selectors">
          <div className="input-group">
            <label>Select Faculty</label>
            <select 
              value={faculty} 
              onChange={(e) => setFaculty(e.target.value)}
              className="apple-select"
            >
              <option value="USC">FCAI USC</option>
              <option value="NUSC">FCAI NUSC</option>
            </select>
          </div>

          <div className="input-group">
            <label>Select Department</label>
            <select 
              value={department} 
              onChange={(e) => setDepartment(e.target.value)}
              className="apple-select"
            >
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button className="btn btn-primary start-btn" onClick={handleStart}>
          Enter Tracker
        </button>
      </div>

      <style jsx>{`
        .landing-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: radial-gradient(circle at center, var(--bg-secondary) 0%, var(--bg-color) 100%);
        }
        
        .landing-content {
          padding: 48px;
          border-radius: 24px;
          width: 100%;
          max-width: 480px;
          display: flex;
          flex-direction: column;
          gap: 32px;
          box-shadow: 0 24px 48px rgba(0,0,0,0.4);
        }
        
        .logo-container {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        
        .logo-icon {
          color: var(--text-primary);
        }
        
        h1 {
          font-size: 24px;
          font-weight: 600;
          letter-spacing: -0.5px;
        }
        
        p {
          color: var(--text-secondary);
          font-size: 14px;
        }
        
        .selectors {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        label {
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .apple-select {
          appearance: none;
          background-color: var(--bg-color);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: 16px;
          border-radius: 12px;
          font-size: 16px;
          font-family: inherit;
          cursor: pointer;
          outline: none;
          transition: all 0.2s ease;
        }
        
        .apple-select:focus {
          border-color: var(--text-secondary);
        }
        
        .start-btn {
          width: 100%;
          padding: 16px;
          font-size: 16px;
          margin-top: 12px;
        }
      `}</style>
    </div>
  );
}

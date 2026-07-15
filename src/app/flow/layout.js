'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { getFacultiesData } from '../actions';

const FlowContext = createContext(null);
export const useFlow = () => useContext(FlowContext);

export default function FlowLayout({ children }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [facultiesData, setFacultiesData] = useState(null);
  const [facultyKey, setFacultyKey] = useState(null);
  const [deptKey, setDeptKey] = useState(null);
  const [completedCourses, setCompletedCourses] = useState(new Set());

  // Load state from local storage
  useEffect(() => {
    getFacultiesData().then(data => {
      setFacultiesData(data);
      const f = localStorage.getItem('fcai_tracker_faculty');
      const d = localStorage.getItem('fcai_tracker_department');
      
      if (!f || !d || !data[f] || !data[f].departments[d]) {
        router.push('/'); // invalid state, back to landing
        return;
      }
    
    setFacultyKey(f);
    setDeptKey(d);
    
    const progressKey = `fcai_tracker_progress_${f}_${d}`;
    try {
      const saved = JSON.parse(localStorage.getItem(progressKey) || '[]');
      setCompletedCourses(new Set(saved));
    } catch (e) {
      setCompletedCourses(new Set());
    }
    
    setMounted(true);
    });
  }, [router]);

  // Save progress automatically
  useEffect(() => {
    if (!mounted || !facultyKey || !deptKey) return;
    const progressKey = `fcai_tracker_progress_${facultyKey}_${deptKey}`;
    localStorage.setItem(progressKey, JSON.stringify(Array.from(completedCourses)));
  }, [completedCourses, mounted, facultyKey, deptKey]);

  const toggleCourse = (code) => {
    setCompletedCourses(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const cascadeUnmark = (code, cascadeList) => {
    setCompletedCourses(prev => {
      const next = new Set(prev);
      next.delete(code);
      cascadeList.forEach(c => next.delete(c));
      return next;
    });
  };

  const toggleSemester = (semesterKey) => {
    const courseCodes = deptData.semesters[semesterKey]?.map(c => c.code) || [];
    if (courseCodes.length === 0) return;

    setCompletedCourses(prev => {
      const next = new Set(prev);
      const allCompleted = courseCodes.every(code => next.has(code));
      
      if (allCompleted) {
        courseCodes.forEach(code => next.delete(code));
      } else {
        courseCodes.forEach(code => next.add(code));
      }
      return next;
    });
  };

  const resetCourses = () => {
    if (confirm("Are you sure you want to reset all your progress?")) {
      setCompletedCourses(new Set());
    }
  };

  if (!mounted || !facultyKey || !facultiesData) return null;

  const data = facultiesData[facultyKey];
  const deptData = data.departments[deptKey];
  const totalHoursRequired = data.meta.total_hours_required || 145;

  // Calculate completed hours
  let completedHours = 0;
  // Combine all courses to lookup hours
  const allCoursesMap = new Map();
  Object.values(deptData.semesters || {}).forEach(courseList => {
    courseList.forEach(c => {
      allCoursesMap.set(c.code, c.hours);
    });
  });

  completedCourses.forEach(code => {
    const hours = allCoursesMap.get(code);
    if (hours) completedHours += hours;
  });

  const progressPercent = Math.min(100, (completedHours / totalHoursRequired) * 100);

  return (
    <FlowContext.Provider value={{
      facultyKey,
      deptKey,
      data,
      deptData,
      allCoursesMap,
      completedCourses,
      toggleCourse,
      cascadeUnmark,
      toggleSemester,
      resetCourses
    }}>
      <div className="flow-layout">
        
        {/* Progress Bar Side Panel */}
        <aside className="progress-sidebar">
          <div className="progress-info">
            <span className="hours-text">{completedHours} / {totalHoursRequired}</span>
            <span className="hours-label">Hours</span>
          </div>
          
          <div className="progress-track">
            <div 
              className="progress-fill" 
              style={{ '--progress': `${progressPercent}%` }}
            />
          </div>
        </aside>

        {/* Main Canvas Area */}
        <main className="flow-main">
          {children}
        </main>
        
        <style jsx>{`
          .flow-layout {
            display: flex;
            height: 100dvh;
            width: 100vw;
            background: var(--bg-color);
          }
          
          .progress-sidebar {
            width: 64px;
            background: var(--bg-secondary);
            border-right: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 24px 0;
            z-index: 10;
          }
          
          .progress-info {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 24px;
            text-align: center;
          }
          
          .hours-text {
            font-size: 11px;
            font-weight: 700;
            color: var(--text-primary);
            white-space: nowrap;
            writing-mode: vertical-rl;
            transform: rotate(180deg);
            margin-bottom: 8px;
          }
          
          .hours-label {
            font-size: 10px;
            color: var(--text-secondary);
            text-transform: uppercase;
            writing-mode: vertical-rl;
            transform: rotate(180deg);
          }
          
          .progress-track {
            flex: 1;
            width: 6px;
            background: var(--bg-tertiary);
            border-radius: 999px;
            position: relative;
            overflow: hidden;
          }
          
          .progress-fill {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: var(--progress);
            background: var(--accent-green);
            box-shadow: 0 0 10px var(--accent-green-glow);
            transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1), width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            border-radius: 999px;
          }
          
          .flow-main {
            flex: 1;
            position: relative;
          }

          @media (max-width: 768px) {
            .flow-layout {
              flex-direction: column;
            }
            .progress-sidebar {
              width: 100%;
              flex-direction: row;
              padding: 12px 16px;
              border-right: none;
              border-bottom: 1px solid var(--border-color);
            }
            .progress-info {
              flex-direction: row;
              margin-bottom: 0;
              margin-right: 16px;
            }
            .hours-text {
              writing-mode: horizontal-tb;
              transform: none;
              margin-bottom: 0;
              margin-right: 8px;
            }
            .hours-label {
              writing-mode: horizontal-tb;
              transform: none;
            }
            .progress-track {
              width: 100%;
              height: 6px;
              flex: 1;
            }
            .progress-fill {
              height: 100%;
              width: var(--progress);
            }
          }
        `}</style>
      </div>
    </FlowContext.Provider>
  );
}

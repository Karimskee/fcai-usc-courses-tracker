import React, { useMemo } from 'react';
import { useFlow } from '../app/flow/layout';

export default function SemesterGroupNode({ data, id }) {
  const { toggleSemester, completedCourses, deptData } = useFlow();

  const isAllCompleted = useMemo(() => {
    const courseCodes = deptData?.semesters[id]?.map(c => c.code) || [];
    return courseCodes.length > 0 && courseCodes.every(c => completedCourses.has(c));
  }, [id, deptData, completedCourses]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      border: '1px dashed rgba(255, 255, 255, 0.1)',
      borderRadius: '24px',
      position: 'relative',
      pointerEvents: 'auto'
    }}>
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '24px',
        right: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{
          color: 'var(--text-secondary)',
          fontSize: '16px',
          fontWeight: '700',
          letterSpacing: '1.5px',
          textTransform: 'uppercase'
        }}>
          {data.label}
        </div>
        <button 
          onClick={() => toggleSemester(id)}
          className={`btn-check-sem ${isAllCompleted ? 'completed' : ''}`}
          title={isAllCompleted ? "Unmark all courses in this semester" : "Mark all courses in this semester as completed"}
        >
          {isAllCompleted ? "Uncheck All" : "Check All"}
        </button>
      </div>

      <style jsx>{`
        .btn-check-sem {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          pointer-events: auto;
        }
        .btn-check-sem:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: scale(1.05);
        }
        .btn-check-sem.completed {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.3);
          color: var(--accent-green);
        }
        .btn-check-sem.completed:hover {
          background: rgba(16, 185, 129, 0.2);
        }
        .btn-check-sem:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
}

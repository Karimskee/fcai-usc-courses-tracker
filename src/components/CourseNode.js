'use client';

import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useFlow } from '../app/flow/layout';

function CourseNode({ data }) {
  const { toggleCourse, cascadeUnmark, data: globalData, deptKey, completedCourses } = useFlow();
  const [showTooltip, setShowTooltip] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);
  const nodeRef = useRef(null);
  const touchTimer = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const wasLongPress = useRef(false);

  const handleClick = (e) => {
    if (wasLongPress.current) {
      wasLongPress.current = false;
      return;
    }
    if (data.state === 'completed') {
      // Find what depends on this
      const cascadeLocks = getCascadeLocks(data.code, completedCourses, globalData, deptKey);
      if (cascadeLocks.length > 0) {
        if (confirm(`Unmarking this will lock: ${cascadeLocks.join(', ')}\nProceed?`)) {
          cascadeUnmark(data.code, cascadeLocks);
        }
      } else {
        toggleCourse(data.code);
      }
    } else if (data.state === 'available') {
      toggleCourse(data.code);
    }
  };

  const handleMouseEnter = (e) => {
    // Only show on desktop (no touch device)
    if (window.matchMedia("(pointer: fine)").matches) {
      setTooltipPos({ x: e.clientX, y: e.clientY });
      setShowTooltip(true);
    }
  };

  const handleMouseMove = (e) => {
    if (showTooltip) {
      setTooltipPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    setIsHolding(true);
    wasLongPress.current = false;

    touchTimer.current = setTimeout(() => {
      wasLongPress.current = true;
      setTooltipPos({ x: touchStartPos.current.x, y: touchStartPos.current.y });
      setShowTooltip(true);
    }, 400);
  };

  const handleTouchEnd = () => {
    if (touchTimer.current) clearTimeout(touchTimer.current);
    setShowTooltip(false);
    setIsHolding(false);
  };

  const handleTouchCancel = () => {
    if (touchTimer.current) clearTimeout(touchTimer.current);
    setShowTooltip(false);
    setIsHolding(false);
  };

  const handleTouchMove = (e) => {
    if (showTooltip) {
      const touch = e.touches[0];
      setTooltipPos({ x: touch.clientX, y: touch.clientY });
    } else {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchStartPos.current.x);
      const dy = Math.abs(touch.clientY - touchStartPos.current.y);
      if (dx > 15 || dy > 15) {
        if (touchTimer.current) clearTimeout(touchTimer.current);
        setIsHolding(false);
      }
    }
  };

  return (
    <>
      <div
        ref={nodeRef}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onTouchMove={handleTouchMove}
        className={`course-bubble state-${data.state} ${isHolding ? 'is-holding' : ''} ${isTouch ? 'nodrag' : ''}`}
      >
        {data.hasPrereq && (
          <Handle 
            type="target" 
            position={Position.Bottom} 
            isConnectable={false}
            style={{ pointerEvents: 'none', cursor: 'default' }} 
          />
        )}
        
        <span className="course-name">{data.name}</span>
        
        {data.isPrereqForSomething && (
          <Handle 
            type="source" 
            position={Position.Top} 
            isConnectable={false}
            style={{ pointerEvents: 'none', cursor: 'default' }} 
          />
        )}
      </div>

      {showTooltip && (
        <TooltipPortal 
          pos={tooltipPos} 
          data={data} 
          isTouch={isTouch}
        />
      )}

      <style jsx>{`
        .course-bubble {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 999px; /* Oval/Bubble */
          padding: 12px 20px;
          min-width: 140px;
          max-width: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
          user-select: none;
        }

        .is-holding {
          transform: scale(1.05);
          box-shadow: 0 8px 15px rgba(0,0,0,0.4);
          z-index: 10;
        }

        .course-name {
          font-size: 13px;
          font-weight: 600;
          line-height: 1.3;
          color: var(--text-primary);
        }

        .state-locked {
          opacity: 0.5;
          border-style: dashed;
        }

        .state-available {
          border-color: #3f3f46;
        }
        
        .state-available:hover {
          transform: translateY(-2px);
          border-color: #a1a1aa;
        }

        .state-completed {
          border-color: var(--accent-green);
          background: rgba(16, 185, 129, 0.1);
          box-shadow: 0 0 15px var(--accent-green-glow);
        }
        
        .state-completed:hover {
          transform: translateY(-2px);
        }
      `}</style>
    </>
  );
}

// Portal for tooltip so it doesn't get clipped by React Flow zoom/pan
import { createPortal } from 'react-dom';

function TooltipPortal({ pos, data, isTouch }) {
  if (typeof document === 'undefined') return null;
  
  return createPortal(
    <div 
      className={`rich-tooltip glass-panel ${isTouch ? 'touch-mode' : 'mouse-mode'}`}
      style={{ left: pos.x, top: pos.y }}
    >
      <div className="tooltip-header">
        <h4>{data.name}</h4>
        <span className="tooltip-hours">{data.hours} hrs</span>
      </div>
      
      {data.prereq && data.prereq.length > 0 && (
        <div className="tooltip-section">
          <strong>Prerequisites:</strong>
          <p>{data.prereq.join(', ')}</p>
        </div>
      )}
      
      <div className="tooltip-section">
        <strong>Expected Professors:</strong>
        <p>{data.doctors && data.doctors.length > 0 ? data.doctors.join(', ') : 'None assigned'}</p>
      </div>

      <style jsx>{`
        .rich-tooltip {
          position: fixed;
          z-index: 1000;
          pointer-events: none;
          padding: 16px;
          border-radius: 12px;
          width: 250px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }

        .mouse-mode {
          transform: translate(15px, 15px);
          animation: fadeInMouse 0.2s ease;
        }

        .touch-mode {
          transform: translate(-50%, calc(-100% - 20px));
          animation: fadeInTouch 0.2s ease;
        }
        
        .tooltip-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding-bottom: 8px;
        }
        
        h4 {
          font-size: 14px;
          line-height: 1.3;
          font-weight: 600;
        }
        
        .tooltip-hours {
          font-size: 12px;
          color: var(--text-secondary);
          background: var(--bg-color);
          padding: 2px 6px;
          border-radius: 4px;
        }
        
        .tooltip-section {
          margin-bottom: 8px;
          font-size: 12px;
        }
        
        .tooltip-section strong {
          color: var(--text-secondary);
          display: block;
          margin-bottom: 4px;
        }
        
        @keyframes fadeInMouse {
          from { opacity: 0; transform: translate(15px, 15px) scale(0.95); }
          to { opacity: 1; transform: translate(15px, 15px) scale(1); }
        }

        @keyframes fadeInTouch {
          from { opacity: 0; transform: translate(-50%, calc(-100% - 5px)) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, calc(-100% - 20px)) scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
}

// Helper to calculate cascade locks
function getCascadeLocks(courseCode, completedCourses, globalData, deptKey) {
  // Build adjacency list for dependents
  const dependents = new Map();
  const addCourse = (c) => {
    if (c.prereq) {
      c.prereq.forEach(p => {
        if (!dependents.has(p)) dependents.set(p, []);
        dependents.get(p).push(c.code);
      });
    }
  };
  
  if (deptKey && globalData.departments[deptKey]) {
    Object.values(globalData.departments[deptKey].semesters || {}).forEach(courseList => {
      courseList.forEach(addCourse);
    });
  }

  const locks = new Set();
  const checkQueue = [...(dependents.get(courseCode) || [])];
  
  while (checkQueue.length > 0) {
    const dep = checkQueue.shift();
    if (completedCourses.has(dep)) {
      locks.add(dep);
      const nextDeps = dependents.get(dep) || [];
      checkQueue.push(...nextDeps);
    }
  }
  
  return Array.from(locks);
}

export default memo(CourseNode);

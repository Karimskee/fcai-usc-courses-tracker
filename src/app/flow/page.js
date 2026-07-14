'use client';

import { useMemo, useCallback } from 'react';
import { ReactFlow, Background, Controls, ControlButton, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useFlow } from './layout';
import CourseNode from '../../components/CourseNode';

const nodeTypes = {
  courseNode: CourseNode,
};

export default function FlowPage() {
  const { 
    deptData, 
    allCoursesMap, 
    completedCourses, 
    toggleCourse 
  } = useFlow();

  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes = [];
    const edges = [];
    
    if (!deptData || !deptData.study_plan) return { initialNodes: [], initialEdges: [] };

    const semesters = [
      'level_1_sem_1', 'level_1_sem_2',
      'level_2_sem_1', 'level_2_sem_2',
      'level_3_sem_1', 'level_3_sem_2',
      'level_4_sem_1', 'level_4_sem_2'
    ];

    const Y_SPACING = 250;
    const X_SPACING = 200;
    
    // Bottom-to-top: Level 1 Sem 1 is at Y = semesters.length * Y_SPACING
    
    semesters.forEach((sem, semIndex) => {
      const coursesInSem = deptData.study_plan[sem] || [];
      const startX = -((coursesInSem.length - 1) * X_SPACING) / 2;
      const y = (semesters.length - semIndex) * Y_SPACING;
      
      coursesInSem.forEach((code, i) => {
        const x = startX + i * X_SPACING;
        
        nodes.push({
          id: code,
          type: 'courseNode',
          position: { x, y },
          data: { code, label: code }
        });
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [deptData]);

  // We are not using local state for nodes/edges yet to keep it simple,
  // but ReactFlow requires state if nodes are draggable.
  // Wait, ReactFlow allows controlled components. 
  // We'll manage nodes and edges in state so they can be dragged.
  
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <FlowCanvas 
        initialNodes={initialNodes} 
        initialEdges={initialEdges} 
      />
    </div>
  );
}

// Inner component to handle state
import { useState, useEffect } from 'react';

function FlowCanvas({ initialNodes, initialEdges }) {
  const { data, completedCourses, resetCourses } = useFlow();
  
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  
  // Update nodes when initialNodes change
  useEffect(() => {
    // We need to inject the full course data and status into the nodes
    const allCourses = new Map();
    const addAll = (arr) => arr.forEach(c => allCourses.set(c.code, c));
    addAll(data.general_requirements.mandatory);
    addAll(data.general_requirements.elective);
    if(data.general_requirements.university_requirement) allCourses.set(data.general_requirements.university_requirement.code, data.general_requirements.university_requirement);
    addAll(data.faculty_requirements.mandatory);
    addAll(data.faculty_requirements.elective);
    Object.values(data.departments).forEach(d => {
      addAll(d.mandatory);
      addAll(d.elective);
    });

    const buildNodeData = (node) => {
      const course = allCourses.get(node.id);
      if (!course) return node;

      const isCompleted = completedCourses.has(node.id);
      // Check prereqs
      const isAvailable = !course.prereq || course.prereq.every(p => completedCourses.has(p));

      let state = 'locked';
      if (isCompleted) state = 'completed';
      else if (isAvailable) state = 'available';

      return {
        ...node,
        data: {
          ...node.data,
          name: course.name_en,
          hours: course.hours,
          prereq: course.prereq,
          doctors: course.expected_doctors,
          state
        }
      };
    };

    setNodes(initialNodes.map(buildNodeData));
    
    // Build edges dynamically based on prereqs of rendered nodes
    const newEdges = [];
    initialNodes.forEach(node => {
      const course = allCourses.get(node.id);
      if (course && course.prereq) {
        course.prereq.forEach(p => {
          // Check if prereq node exists in initialNodes
          if (initialNodes.some(n => n.id === p)) {
            const prereqCompleted = completedCourses.has(p);
            const thisCompleted = completedCourses.has(node.id);
            
            // If target is completed, edge is green.
            // If source is completed but target is not, edge is animated (active)
            // Else edge is gray
            let edgeClass = 'edge-locked';
            if (thisCompleted) edgeClass = 'edge-completed';
            else if (prereqCompleted) edgeClass = 'edge-active';
            
            newEdges.push({
              id: `e-${p}-${node.id}`,
              source: p,
              target: node.id,
              type: 'straight',
              animated: edgeClass === 'edge-active',
              className: edgeClass
            });
          }
        });
      }
    });
    setEdges(newEdges);

  }, [initialNodes, completedCourses, data]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#27272a" gap={20} size={1} />
        <Controls showInteractive={false} className="dark-controls">
          <ControlButton onClick={resetCourses} title="Reset Progress" style={{ order: -1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 14L4 9l5-5" />
              <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
            </svg>
          </ControlButton>
        </Controls>
      </ReactFlow>

      <style jsx global>{`
        .edge-locked path {
          stroke: #3f3f46;
          stroke-width: 2px;
          stroke-dasharray: 5, 5;
        }
        .edge-active path {
          stroke: #a1a1aa;
          stroke-width: 2px;
          stroke-dasharray: 5, 5;
        }
        .edge-completed path {
          stroke: var(--accent-green);
          stroke-width: 2px;
        }
        
        .dark-controls {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .dark-controls button {
          background: transparent;
          border-bottom: 1px solid var(--border-color);
          fill: var(--text-primary);
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .dark-controls button:last-child {
          border-bottom: none;
        }
        .dark-controls button:hover {
          background: rgba(255,255,255,0.1);
        }
      `}</style>
    </>
  );
}

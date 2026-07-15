'use client';

import { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ReactFlow, Background, Controls, ControlButton, MiniMap, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useFlow } from './layout';
import CourseNode from '../../components/CourseNode';
import SemesterGroupNode from '../../components/SemesterGroupNode';

const nodeTypes = {
  courseNode: CourseNode,
  semesterGroup: SemesterGroupNode,
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
    
    if (!deptData || !deptData.semesters) return { initialNodes: [], initialEdges: [] };

    const semesters = [
      'level_1_sem_1', 'level_1_sem_2',
      'level_2_sem_1', 'level_2_sem_2',
      'level_3_sem_1', 'level_3_sem_2',
      'level_4_sem_1', 'level_4_sem_2'
    ];

    const addedNodes = new Set();
    
    // Layout parameters
    const NODE_WIDTH = 250;
    const NODE_HEIGHT = 90;
    const GAP_X = 40;
    const GAP_Y = 220; // Distance between semesters
    const TITLE_PADDING = 50;
    const PADDING_BOX = 40; // Horizontal padding for the group box

    let currentY = 0;
    
    // We process only semesters that exist in the actual object
    semesters.forEach((sem) => {
      const coursesInSem = deptData.semesters[sem] || [];
      if (coursesInSem.length === 0) return;

      const semLabel = sem.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      
      const rowWidth = coursesInSem.length * NODE_WIDTH + (coursesInSem.length - 1) * GAP_X;
      
      // Calculate group dimensions and absolute position
      const groupWidth = rowWidth + PADDING_BOX;
      const groupHeight = NODE_HEIGHT + TITLE_PADDING + 30; // 50 for title, 30 for bottom padding
      const groupX = -groupWidth / 2;
      const groupY = currentY;

      // Add Semester Group Node
      nodes.push({
        id: sem,
        type: 'semesterGroup',
        data: { label: semLabel },
        position: { x: groupX, y: groupY },
        style: { width: groupWidth, height: groupHeight },
        draggable: false,
        selectable: false
      });

      // Add Course Nodes (positioned relative to their parent group)
      coursesInSem.forEach((course, index) => {
        const code = course.code;
        if (addedNodes.has(code)) return;
        addedNodes.add(code);
        
        // Relative X coordinate inside the group box
        // We start with half the padding to center it horizontally inside the box
        const relativeX = (PADDING_BOX / 2) + index * (NODE_WIDTH + GAP_X);
        const relativeY = TITLE_PADDING;
        
        nodes.push({
          id: code,
          type: 'courseNode',
          parentId: sem,
          extent: 'parent',
          position: { x: relativeX, y: relativeY },
          data: { code, label: code }
        });
      });

      currentY -= (groupHeight + GAP_Y);
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
  const { data, deptData, completedCourses, resetCourses } = useFlow();
  const router = useRouter();
  
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  
  // Update nodes when initialNodes change
  useEffect(() => {
    // We need to inject the full course data and status into the nodes
    const allCourses = new Map();
    Object.values(deptData.semesters || {}).forEach(courseList => {
      courseList.forEach(c => allCourses.set(c.code, c));
    });

    const isPrereqFor = new Set();
    const hasPrereqSet = new Set();
    
    initialNodes.forEach(node => {
      const course = allCourses.get(node.id);
      if (course && course.prereq) {
        course.prereq.forEach(p => {
          if (initialNodes.some(n => n.id === p)) {
            isPrereqFor.add(p);
            hasPrereqSet.add(node.id);
          }
        });
      }
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
          state,
          hasPrereq: hasPrereqSet.has(node.id),
          isPrereqForSomething: isPrereqFor.has(node.id)
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
              type: 'default', // Bezier curvy lines
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
        fitViewOptions={{ 
          nodes: [{ id: 'level_1_sem_1' }], 
          maxZoom: 1, 
          padding: 0.2 
        }}
        minZoom={0.1}
        maxZoom={2}
        nodesConnectable={false}
        elementsSelectable={false}
        nodesDraggable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#27272a" gap={20} size={1} />
        <Controls showInteractive={false} className="dark-controls">
          <ControlButton onClick={() => router.push('/')} title="Home" style={{ order: -2 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </ControlButton>
          <ControlButton onClick={resetCourses} title="Reset Progress" style={{ order: -1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 14L4 9l5-5" />
              <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
            </svg>
          </ControlButton>
        </Controls>
        <MiniMap 
          className="flow-minimap"
          nodeColor={(n) => {
            if (n.data?.state === 'completed') return '#10b981';
            if (n.data?.state === 'available') return '#a1a1aa';
            return '#3f3f46';
          }}
          maskColor="rgba(0, 0, 0, 0.75)"
          style={{ 
            backgroundColor: 'var(--bg-tertiary)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '8px',
            overflow: 'hidden',
            width: 150,
            height: 100
          }}
          position="bottom-right"
          pannable
          zoomable
        />
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

        @media (max-width: 768px) {
          .flow-minimap {
            display: none !important;
          }
          
          .dark-controls {
            flex-direction: row;
            border-radius: 99px;
            bottom: 24px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            margin: 0 !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            padding: 6px 12px;
            gap: 12px;
            border: 1px solid var(--border-color);
          }

          .dark-controls button {
            width: 44px;
            height: 44px;
            padding: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.05);
          }
          
          .dark-controls svg {
            width: 22px;
            height: 22px;
          }
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

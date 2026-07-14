'use client';

import { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ReactFlow, Background, Controls, ControlButton, MiniMap, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
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
    
    if (!deptData || !deptData.study_plan) return { initialNodes: [], initialEdges: [] };

    const g = new dagre.graphlib.Graph({ compound: true });
    g.setGraph({ rankdir: 'BT', nodesep: 50, ranksep: 150 }); // Slightly increased ranksep for bezier curves
    g.setDefaultEdgeLabel(() => ({}));

    const semesters = [
      'level_1_sem_1', 'level_1_sem_2',
      'level_2_sem_1', 'level_2_sem_2',
      'level_3_sem_1', 'level_3_sem_2',
      'level_4_sem_1', 'level_4_sem_2'
    ];

    const addedNodes = new Set();
    
    // Add Semester Group Nodes
    semesters.forEach(sem => {
      // Clean up the semester name for display
      const semLabel = sem.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      
      nodes.push({
        id: sem,
        type: 'semesterGroup',
        data: { label: semLabel },
        draggable: false,
        selectable: false
      });
      g.setNode(sem, { label: semLabel, clusterLabelPos: 'top' });
    });

    semesters.forEach((sem) => {
      const coursesInSem = deptData.study_plan[sem] || [];
      
      coursesInSem.forEach((code) => {
        if (addedNodes.has(code)) return;
        addedNodes.add(code);
        
        g.setNode(code, { width: 250, height: 90 });
        g.setParent(code, sem);
        
        nodes.push({
          id: code,
          type: 'courseNode',
          parentId: sem,
          extent: 'parent',
          data: { code, label: code }
        });
      });
    });

    // Add edges to Dagre for calculation
    Object.values(deptData.departments || {}).forEach(dept => {
      // Collect all prerequisites from the study plan to feed into Dagre
      // This helps Dagre know the connections so it can minimize line crossings
    });
    // Wait, initialEdges aren't computed until FlowCanvas!
    // Dagre needs edges to minimize crossings.
    // Let's compute edges here as well.
    const allCourses = new Map();
    const addAll = (arr) => arr?.forEach(c => allCourses.set(c.code, c));
    addAll(deptData.general_requirements?.mandatory);
    addAll(deptData.general_requirements?.elective);
    if(deptData.general_requirements?.university_requirement) allCourses.set(deptData.general_requirements.university_requirement.code, deptData.general_requirements.university_requirement);
    addAll(deptData.faculty_requirements?.mandatory);
    addAll(deptData.faculty_requirements?.elective);
    Object.values(deptData.departments || {}).forEach(d => {
      addAll(d.mandatory);
      addAll(d.elective);
    });

    // We will rely on FlowCanvas to draw the visual edges, but we must feed them to Dagre here!
    nodes.forEach(node => {
      if (node.type === 'courseNode') {
        const course = allCourses.get(node.id);
        if (course && course.prereq) {
          course.prereq.forEach(p => {
            if (nodes.some(n => n.id === p)) {
              g.setEdge(p, node.id, { weight: 1 });
            }
          });
        }
      }
    });

    // Force semester groups to stack vertically bottom-to-top
    // Dagre does not support edges between compound (group) nodes directly.
    // Instead, we create an invisible dummy child node in each semester and link them!
    semesters.forEach((sem, i) => {
      const dummyId = `dummy_${sem}`;
      g.setNode(dummyId, { width: 1, height: 1 });
      g.setParent(dummyId, sem);
      
      if (i > 0) {
        g.setEdge(`dummy_${semesters[i - 1]}`, dummyId, { weight: 1000 });
      }
    });

    // Run the algorithmic layout
    dagre.layout(g);

    // Apply the mathematically perfect coordinates to the nodes
    nodes.forEach((node) => {
      const nodeWithPosition = g.node(node.id);
      node.targetPosition = 'bottom';
      node.sourcePosition = 'top';
      
      if (node.type === 'semesterGroup') {
        const groupWidth = nodeWithPosition.width + 40;
        node.style = { 
          width: groupWidth, 
          height: nodeWithPosition.height + 80 // extra room for title
        };
        // FORCE the group to perfectly center itself along the vertical axis (X=0)
        node.position = {
          x: -groupWidth / 2,
          y: nodeWithPosition.y - nodeWithPosition.height / 2 - 50 // Shift up for title
        };
      } else {
        const parentPosition = g.node(node.parentId);
        if (parentPosition) {
          node.position = {
            x: nodeWithPosition.x - parentPosition.x + parentPosition.width / 2 - nodeWithPosition.width / 2 + 20,
            y: nodeWithPosition.y - parentPosition.y + parentPosition.height / 2 - nodeWithPosition.height / 2 + 50
          };
        }
      }
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
  const router = useRouter();
  
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

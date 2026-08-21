import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  ControlButton,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
  Handle,
  Position,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  SelectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import './ProjectMindMapView.css';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../api';
import { useUndo } from '../context/UndoContext';

// ─── Dagre auto-layout (only used on first load when no saved positions exist) ──
const getLayoutedElements = (nodes, edges, direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction, nodesep: 60, ranksep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 200, height: 80 });
  });
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const pos = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      position: { x: pos.x - 100, y: pos.y - 40 },
    };
  });
};

// ─── Storage helpers ───────────────────────────────────────────────────────────
const storageKey = (projectId) => `mindmap_positions_${projectId}`;

const savePositions = (projectId, nodes) => {
  const positions = {};
  nodes.forEach((n) => { positions[n.id] = n.position; });
  try {
    localStorage.setItem(storageKey(projectId), JSON.stringify(positions));
  } catch (_) { }
};

const loadPositions = (projectId) => {
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
};

// ─── Build edges from task dependency data ────────────────────────────────────
const buildEdges = (tasks) => {
  const edges = [];
  const seen = new Set();

  tasks.forEach((task) => {
    // task.blockedBy => array of TaskDependency rows { id, blockingId, blockedById, blockingTask }
    if (task.blockedBy && Array.isArray(task.blockedBy)) {
      task.blockedBy.forEach((dep) => {
        const sourceId = dep.blockingId;   // the task that must finish first
        const targetId = task.id;           // this task is blocked by it
        const edgeId = `dep-${dep.id}`;

        if (!sourceId || seen.has(edgeId)) return;
        seen.add(edgeId);

        edges.push({
          id: edgeId,
          source: sourceId,
          target: targetId,
          animated: !dep.blockingTask?.isCompleted,
          style: {
            stroke: dep.blockingTask?.isCompleted ? 'var(--accent-success)' : 'var(--text-tertiary)',
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: dep.blockingTask?.isCompleted ? 'var(--accent-success)' : 'var(--text-tertiary)',
          },
          data: { dependencyId: dep.id },
        });
      });
    }
  });

  return edges;
};

// ─── Custom Node ───────────────────────────────────────────────────────────────
const CustomNode = ({ data, targetPosition, sourcePosition, isConnectable }) => {
  const { task, t, onTaskClick } = data;
  return (
    <div
      className={`mind-map-node ${task.isCompleted ? 'completed' : 'incomplete'}`}
      onDoubleClick={() => onTaskClick && onTaskClick(task.id)}
    >
      <Handle
        type="target"
        position={targetPosition || Position.Left}
        isConnectable={isConnectable}
        style={{ background: 'var(--text-tertiary)' }}
      />
      <div className="mind-map-node-header">
        {task.isCompleted ? '✓' : '○'} {task.title || 'Untitled Task'}
      </div>
      {task.assignee && (
        <div className="mind-map-node-subtitle">
          {t('assignee', 'Assignee')}: {task.assignee.name}
        </div>
      )}
      {task.dueDate && (
        <div className="mind-map-node-subtitle">
          {t('due', 'Due')}: {new Date(task.dueDate).toLocaleDateString()}
        </div>
      )}
      <Handle
        type="source"
        position={sourcePosition || Position.Right}
        isConnectable={isConnectable}
        style={{ background: 'var(--text-tertiary)' }}
      />
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

// ─── Inner component (needs ReactFlow context for useReactFlow) ────────────────
function MindMapInner({ selectedProject, onTaskClick }) {
  const { t } = useTranslation();
  const { showUndo } = useUndo();
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectMode, setSelectMode] = useState(true);
  const initializedRef = useRef(null);
  const saveTimerRef = useRef(null);
  const edgesRef = useRef(edges);
  const { fitView } = useReactFlow();

  // Keep edgesRef in sync so callbacks can read latest edges
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  // ── Initialize nodes/edges when the project ID changes ───────────────────────
  useEffect(() => {
    if (!selectedProject) return;
    const projectId = selectedProject.id;

    const allTasks = [];
    selectedProject.sections?.forEach((section) => {
      section.tasks?.forEach((task) => allTasks.push(task));
    });

    const initialEdges = buildEdges(allTasks);
    const savedPositions = loadPositions(projectId);

    let initialNodes = allTasks.map((task) => ({
      id: task.id,
      type: 'custom',
      data: { task, t, onTaskClick },
      position: savedPositions?.[task.id] ?? { x: 0, y: 0 },
      targetPosition: 'left',
      sourcePosition: 'right',
    }));

    // Only run dagre layout when no saved positions exist
    if (!savedPositions) {
      initialNodes = getLayoutedElements(initialNodes, initialEdges, 'LR');
    }

    setNodes(initialNodes);
    setEdges(initialEdges);
    initializedRef.current = projectId;

    setTimeout(() => fitView({ padding: 0.2 }), 60);
    // Only re-run when the project ID changes (not on every data refresh)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject?.id]);

  // ── Update node data & edges when task data refreshes (no position reset) ────
  useEffect(() => {
    if (!selectedProject || initializedRef.current !== selectedProject.id) return;

    const allTasks = [];
    selectedProject.sections?.forEach((s) => s.tasks?.forEach((task) => allTasks.push(task)));

    setNodes((prev) => {
      const taskMap = Object.fromEntries(allTasks.map((task) => [task.id, task]));
      return prev.map((node) =>
        taskMap[node.id]
          ? { ...node, data: { ...node.data, task: taskMap[node.id] } }
          : node
      );
    });

    setEdges(buildEdges(allTasks));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  // ── Debounced position save on drag ──────────────────────────────────────────
  const onNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => {
        const updated = applyNodeChanges(changes, nds);
        if (selectedProject?.id) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = setTimeout(() => {
            savePositions(selectedProject.id, updated);
          }, 500);
        }
        return updated;
      });
    },
    [selectedProject?.id]
  );

  // ── Edge removal → delete dependency in backend + undo toast ─────────────────
  const onEdgesChange = useCallback(
    (changes) => {
      changes.forEach(async (change) => {
        if (change.type === 'remove') {
          const edge = edgesRef.current.find((e) => e.id === change.id);
          const dependencyId = edge?.data?.dependencyId;
          const sourceTaskId = edge?.source;
          const targetTaskId = edge?.target;

          if (dependencyId && targetTaskId && sourceTaskId) {
            try {
              const token = localStorage.getItem('token');
              await apiFetch(`/api/projects/tasks/${targetTaskId}/dependencies/${dependencyId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });

              // Show undo toast — re-creates the dependency on undo
              showUndo({
                message: 'Connection removed',
                onUndo: async () => {
                  try {
                    const res = await apiFetch(`/api/projects/tasks/${targetTaskId}/dependencies`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ blockingId: sourceTaskId }),
                    });
                    if (res.ok) {
                      const dep = await res.json();
                      const restoredEdge = {
                        ...edge,
                        id: `dep-${dep.id}`,
                        data: { dependencyId: dep.id },
                      };
                      setEdges((eds) => [...eds, restoredEdge]);
                    }
                  } catch (err) {
                    console.error('Undo dependency failed:', err);
                  }
                },
              });
            } catch (err) {
              console.error('Failed to delete dependency:', err);
            }
          }
        }
      });
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [showUndo]
  );

  // ── New connection → save dependency to backend ───────────────────────────────
  const onConnect = useCallback(
    async (params) => {
      const sourceTaskId = params.source; // blocking task
      const targetTaskId = params.target; // blocked task

      if (!sourceTaskId || !targetTaskId || sourceTaskId === targetTaskId) return;

      try {
        const token = localStorage.getItem('token');
        const res = await apiFetch(`/api/projects/tasks/${targetTaskId}/dependencies`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ blockingId: sourceTaskId }),
        });

        if (res.ok) {
          const dep = await res.json();
          const newEdge = {
            id: `dep-${dep.id}`,
            source: sourceTaskId,
            target: targetTaskId,
            animated: true,
            style: { stroke: 'var(--text-tertiary)', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--text-tertiary)' },
            data: { dependencyId: dep.id },
          };
          setEdges((eds) => addEdge(newEdge, eds));
        } else {
          const body = await res.json().catch(() => ({}));
          console.error('Failed to create dependency:', body.error || res.status);
        }
      } catch (err) {
        console.error('Error creating dependency:', err);
      }
    },
    []
  );

  // ── Node single-click (only in select mode) ──────────────────────────────────
  const onNodeClick = useCallback(
    (_event, node) => {
      if (selectMode && onTaskClick) {
        onTaskClick(node.data.task.id);
      }
    },
    [selectMode, onTaskClick]
  );

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
        attributionPosition="bottom-left"
        selectionOnDrag={selectMode}
        panOnDrag={selectMode ? [2] : true}
        nodesDraggable={true}
        selectionMode={SelectionMode.Partial}
      >
        <Controls showInteractive={false}>
          <ControlButton
            onClick={() => setSelectMode((m) => !m)}
            title={selectMode ? 'Disable select mode' : 'Enable select / lasso mode'}
            style={{
              background: selectMode ? 'var(--accent-primary)' : undefined,
              color: selectMode ? '#fff' : undefined,
            }}
          >
            {/* Normal cursor arrow icon */}
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
              <path d="M4 0 L4 20 L8.5 15.5 L11.5 22 L13.5 21 L10.5 14 L16 14 Z" />
            </svg>
          </ControlButton>
        </Controls>
        <Background color="var(--border-color)" gap={16} />
      </ReactFlow>
    </div>
  );
}

// ─── Public export wrapped in ReactFlowProvider ───────────────────────────────
export default function ProjectMindMapView({ selectedProject, onTaskClick }) {
  return (
    <div style={{ flex: 1, minHeight: 0, width: '100%', position: 'relative', backgroundColor: 'var(--bg-secondary)' }}>
      <ReactFlowProvider>
        <MindMapInner selectedProject={selectedProject} onTaskClick={onTaskClick} />
      </ReactFlowProvider>
    </div>
  );
}

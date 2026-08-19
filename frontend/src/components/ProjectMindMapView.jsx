import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
  Handle,
  Position,
  addEdge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import './ProjectMindMapView.css';
import { useTranslation } from 'react-i18next';

const position = { x: 0, y: 0 };

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    // Make nodes wider for better readability
    dagreGraph.setNode(node.id, { width: 200, height: 80 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = isHorizontal ? 'left' : 'top';
    node.sourcePosition = isHorizontal ? 'right' : 'bottom';

    // Shift to center the node based on width/height
    node.position = {
      x: nodeWithPosition.x - 200 / 2,
      y: nodeWithPosition.y - 80 / 2,
    };

    return node;
  });

  return { nodes, edges };
};

const CustomNode = ({ data, targetPosition, sourcePosition, isConnectable }) => {
  const { task, t, onTaskClick } = data;
  return (
    <div 
      className={`mind-map-node ${task.isCompleted ? 'completed' : 'incomplete'}`}
      onDoubleClick={() => onTaskClick && onTaskClick(task)}
    >
      <Handle type="target" position={targetPosition || Position.Top} isConnectable={isConnectable} style={{ background: 'var(--text-tertiary)' }} />
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
      <Handle type="source" position={sourcePosition || Position.Bottom} isConnectable={isConnectable} style={{ background: 'var(--text-tertiary)' }} />
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

export default function ProjectMindMapView({ selectedProject, onTaskClick }) {
  const { t } = useTranslation();
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  useEffect(() => {
    if (!selectedProject) return;

    const initialNodes = [];
    const initialEdges = [];

    // Collect all tasks to build nodes and dependency edges
    const allTasks = [];
    selectedProject.sections?.forEach(section => {
      section.tasks?.forEach(task => {
        allTasks.push(task);
        
        initialNodes.push({
          id: task.id,
          type: 'custom',
          data: {
            task: task,
            t: t,
            onTaskClick: onTaskClick
          },
          position, // layouted later
        });

        // Add edges for dependencies
        // task.blockedBy contains dependencies where blockingTask is the task that must be done first
        if (task.blockedBy && Array.isArray(task.blockedBy)) {
          task.blockedBy.forEach(dep => {
            if (dep.blockingTaskId) {
              initialEdges.push({
                id: `e${dep.blockingTaskId}-${task.id}`,
                source: dep.blockingTaskId,
                target: task.id,
                animated: !dep.blockingTask?.isCompleted, // Animate line if dependency is not completed
                style: { stroke: dep.blockingTask?.isCompleted ? 'var(--accent-success)' : 'var(--text-tertiary)', strokeWidth: 2 },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  color: dep.blockingTask?.isCompleted ? 'var(--accent-success)' : 'var(--text-tertiary)',
                },
              });
            }
          });
        }
      });
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges
    );

    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
  }, [selectedProject, t, onTaskClick]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'var(--text-tertiary)', strokeWidth: 2 } }, eds)),
    []
  );

  return (
    <div className="mind-map-view-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls className="mind-map-controls" />
        <Background color="var(--border-color)" gap={16} />
      </ReactFlow>
    </div>
  );
}

import {
  ToposorterStateManagerContext,
  TNode,
} from "./ToposorterState";
import * as dagre from "@dagrejs/dagre";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
  useReactFlow,
  useNodesInitialized,
  applyNodeChanges,
  applyEdgeChanges,
  OnNodesChange,
  OnEdgesChange,
  BackgroundVariant,
} from "reactflow";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import "reactflow/dist/style.css";
import { UIStateContext } from "./ui_state";
import { useSelectedNode } from "./Selection";
import { CustomNode } from "./CustomNode";

const nodeTypes = {
  custom: CustomNode,
};

export function Canvas(props: { nodes: Record<string, TNode> }) {
  const stateManager = useContext(ToposorterStateManagerContext)!;
  const nodesInitialized = useNodesInitialized();

  const g = useMemo(
    () => new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({})),
    []
  );

  const [initialNodes, initialEdges] = useMemo(() => {
    const initialNodes = [];
    const initialEdges = [];
    for (const [id, node] of Object.entries(props.nodes)) {
      initialNodes.push({
        id,
        type: "custom",
        data: { ...node, id },
        position: { x: 0, y: 0 },
      });
      initialEdges.push(
        ...node.children.map((child) => ({
          id: `${id}--${child}`,
          source: id,
          target: child,
        }))
      );
    }
    return [initialNodes, initialEdges];
  }, [props.nodes]);

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  useEffect(() => {
    if (!nodesInitialized) {
      return;
    }
    setNodes((nodes) => {
      let obj = Object.fromEntries(initialNodes.map((node) => [node.id, node]));
      let overwrite = Object.fromEntries(
        nodes
          .filter((node) => node.id in obj)
          .map((node) => [
            node.id,
            {
              // Keep position and other data.
              ...node,
              // Carry updated data over.
              ...{ data: obj[node.id].data },
            },
          ])
      );
      let out = Object.values({ ...obj, ...overwrite });
      out = getLayoutedElements(g, out, initialEdges).nodes;
      return out;
    });
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, nodesInitialized]);

  const [, setSelectedNode] = useSelectedNode();
  const uiState = useContext(UIStateContext)!;

  const onNodesChange: OnNodesChange = useCallback(
    (changes) =>
      setNodes((nds) => {
        for (const change of changes) {
          if (change.type === "remove") {
            stateManager.deleteNode(change.id);
          }
          if (change.type === "dimensions") {
            setSelectedNode(change.id);
            uiState.focusTitle();
          }
        }
        return applyNodeChanges(changes, nds);
      }),
    [setNodes]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) =>
      setEdges((eds) => {
        for (const change of changes) {
          if (change.type === "remove") {
            stateManager.deleteEdge(change.id);
          }
        }
        return applyEdgeChanges(changes, eds);
      }),
    [setEdges]
  );

  const onConnect = useCallback(
    (connection: { source: string; target: string }) => {
      const fromId = connection.source;
      const toId = connection.target;
      if (!fromId || !toId) {
        return;
      }
      stateManager?.addEdge(fromId, toId);
    },
    [stateManager]
  );

  return (
    <ReactFlow
      proOptions={{ hideAttribution: true }}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodesDraggable
      fitView
    >
      <Background
        color="white"
        style={{ opacity: "0.15" }}
        variant={BackgroundVariant.Lines}
        gap={60}
        size={1}
      />
      <Controls className="invert" />
    </ReactFlow>
  );
}

function getLayoutedElements(
  g: dagre.graphlib.Graph,
  nodes: Node[],
  edges: Edge[],
) {
  g.setGraph({ 
    rankdir: 'RL',
    align: 'UL',
    ranker: "tight-tree",
    // ranker: 'longest-path',
    esep: 10,
    disableOptimalOrderHeuristic: true,
  });

  edges.forEach((edge) => g.setEdge(edge.source, edge.target));
  nodes.forEach((node) => g.setNode(node.id, node as any));
  dagre.layout(g);
  return {
    nodes: nodes.map((node) => {
      const dagreNode = g.node(node.id);
      return {
        ...node,
        position: {
          x: dagreNode.x,
          y: dagreNode.y,
        },
      };
    }),
    edges,
  };
}

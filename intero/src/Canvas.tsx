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
import { CanvasManagerContext, EdgesContext, NodesContext } from "./canvas_controller";

const nodeTypes = {
  custom: CustomNode,
};

export function Canvas() {
  const nodes = useContext(NodesContext);
  const edges = useContext(EdgesContext);
  const {
    setNodes,
    setEdges
  } = useContext(CanvasManagerContext)!;

  const stateManager = useContext(ToposorterStateManagerContext)!;
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

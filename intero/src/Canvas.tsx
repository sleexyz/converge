import { ToposorterStateManagerContext } from "./ToposorterState";
import ReactFlow, {
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  OnNodesChange,
  OnEdgesChange,
  BackgroundVariant,
} from "reactflow";
import { useCallback, useContext } from "react";
import "reactflow/dist/style.css";
import { CustomNode } from "./CustomNode";
import {
  CanvasManagerContext,
  EdgesContext,
  NodesContext,
} from "./canvas_controller";

const nodeTypes = {
  custom: CustomNode,
};

export function Canvas() {
  const nodes = useContext(NodesContext);
  const edges = useContext(EdgesContext);
  const canvasManager = useContext(CanvasManagerContext)!;

  const stateManager = useContext(ToposorterStateManagerContext)!;

  const onNodesChange: OnNodesChange = useCallback(
    (changes) =>
      canvasManager.setNodes((nds) => {
        for (const change of changes) {
          if (change.type === "remove") {
            stateManager.deleteNode(change.id);
          }
          if (change.type === "dimensions") {
            // setSelectedNode(change.id);
            // uiState.focusTitle();
          }
        }
        return applyNodeChanges(changes, nds);
      }),
    [canvasManager.setNodes]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) =>
      canvasManager.setEdges((eds) => {
        for (const change of changes) {
          if (change.type === "remove") {
            stateManager.deleteEdge(change.id);
          }
        }
        return applyEdgeChanges(changes, eds);
      }),
    [canvasManager.setEdges]
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
      nodeOrigin={[0.5, 0.5]}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodesDraggable
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

import { ToposorterStateManagerContext } from "./ToposorterState";
import ReactFlow, {
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  OnNodesChange,
  OnEdgesChange,
  BackgroundVariant,
  useNodesInitialized,
  Panel,
} from "reactflow";
import { useCallback, useContext } from "react";
import "reactflow/dist/style.css";
import { CustomNode } from "./CustomNode";
import {
  CanvasManagerContext,
  EdgesContext,
  NodesContext,
} from "./canvas_controller";
import { useSelectedNode } from "./Selection";
import { UIStateContext } from "./ui_state";
import { SearchBox } from "./SearchBox";
import { SelectionPane } from "./SelectionPane";
import { CommandLine } from "./CommandLine";
import CustomEdge from "./CustomEdge";

const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

export function Canvas() {
  const nodes = useContext(NodesContext);
  const edges = useContext(EdgesContext);
  const canvasManager = useContext(CanvasManagerContext)!;

  const stateManager = useContext(ToposorterStateManagerContext)!;
  const nodesInitialized = useNodesInitialized();

  const [, setSelectedNode] = useSelectedNode();
  const uiState = useContext(UIStateContext)!;


  const onNodesChange: OnNodesChange = useCallback(
    (changes) =>
      canvasManager.setNodes((nds) => {
        for (const change of changes) {
          // Propagate canvas deletions to state deletions.
          if (change.type === "remove") {
            stateManager.deleteNode(change.id);
          }
        }
        return applyNodeChanges(changes, nds);
      }),
    [canvasManager.setNodes, nodesInitialized, setSelectedNode, uiState]
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
      nodeOrigin={[0, 0.5]}
      nodes={nodes}
      edges={edges}
      // snapToGrid={true}
      // snapGrid={[50, 50]}
      edgeTypes={edgeTypes}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodesDraggable
    >      
      <Panel position="top-left" className="m-0 h-full">
        <div className="flex items-center justify-center align-center h-full">
            <SelectionPane />
        </div>right
      </Panel>
      <Panel position="top-center" className="mt-8 mx-0">
        <CommandLine />
      </Panel>
      <Panel position="top-left" className="mt-8 mx-0">
        <SearchBox />
      </Panel>
      <Controls />
    </ReactFlow>
  );
}

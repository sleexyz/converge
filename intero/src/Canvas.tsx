import { StateManagerContext, TNode, ToposorterStateContext } from "./ToposorterState";
import * as dagre from "@dagrejs/dagre";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
  useReactFlow,
  Handle,
  Position,
  useNodesInitialized,
  applyNodeChanges,
  applyEdgeChanges,
  OnNodesChange,
  OnEdgesChange,
  BackgroundVariant,
} from "reactflow";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import "reactflow/dist/style.css";

const nodeTypes = {
  custom: CustomNode,
};

function CustomNode(props: { data: TNode; id: string; selected: boolean }) {
  let classes = "";

  if (props.data.status === "done") {
    classes = "bg-slate-800 text-white";
  } else if (props.data.status === "active") {
    classes = "bg-slate-500 text-white";
  } else {
    classes = "bg-black text-white";
    classes += " border-dashed";
  }

  if (props.selected) {
    classes += " border-2 border-indigo-500";
  } else {
    classes += " border-2 border-gray-500";
  }
  const chipText = props.id.substring(0, 3); // Get the first two characters of the id


  return (
    <>
      <Handle type="target" position={Position.Right} />
      <div className={` box-content p-2 rounded-2xl ${classes}`}>
        {props.data.value.split("\n")[0]}
        <div className="font-mono absolute top-[-15px] right-[-25px] text-gray-500 font-bold rounded-full px-2 py-1 text-xs">
          {chipText}
        </div>
      </div>
      <div></div>
      <Handle type="source" position={Position.Left} />
    </>
  );
}

export function Canvas(props: { nodes: Record<string, TNode> }) {
  const stateManager = useContext(StateManagerContext)!;
  const state = useContext(ToposorterStateContext)!;
  const { fitView } = useReactFlow();
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
      out = getLayoutedElements(g, out, initialEdges, {
        rankdir: "RL",
      }).nodes;
      return out;
    });
    setEdges(initialEdges);
    window.requestAnimationFrame(() => {
      fitView();
    });
  }, [initialNodes, initialEdges, nodesInitialized]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) =>
      setNodes((nds) => {
        return applyNodeChanges(changes, nds);
      }),
    [setNodes]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) =>
      setEdges((eds) => {
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
      const from = state.reconcileId(fromId);
      const to = state.reconcileId(toId);
      stateManager?.addEdge(from, to);
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
  options: {
    rankdir: "TB" | "BT" | "LR" | "RL";
  }
) {
  g.setGraph({ rankdir: options.rankdir });

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

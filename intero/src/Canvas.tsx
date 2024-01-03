import { StateManagerContext, TNode } from "./ToposorterState";
import * as dagre from "@dagrejs/dagre";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  Handle,
  Position,
  useNodesInitialized,
  applyNodeChanges,
  applyEdgeChanges,
  OnNodesChange,
  OnEdgesChange,
} from "reactflow";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import "reactflow/dist/style.css";
import { format } from 'date-fns';

const nodeTypes = {
  custom: CustomNode,
};

function CustomNode(props: { data: TNode; id: string }) {
  let classes = "bg-black text-white";
  if (props.data.status === "done") {
    classes = "bg-white text-black"
  }
  if (props.data.status === "active") {
    classes += " border-4 border-blue-500";
  } else {
    classes += " border-2 border-white";
  }
  const chipText = props.id.substring(0, 3); // Get the first two characters of the id

  const formattedDate = format(props.data.createdAt, 'yyyy-MM-dd HH:mm');


  return (
    <>
      <Handle type="target" position={Position.Right} />
      <div className={`p-2 rounded-xl ${classes}`}>
        {props.data.value}
        <div className="font-mono absolute top-[-15px] right-[-25px] text-blue-500 font-bold rounded-full px-2 py-1 text-xs">
          {chipText}
        </div>
        <div className="font-mono absolute bottom-[-15px] right-[-25px] text-red-500 font-bold rounded-full px-2 py-1 text-xs overflow-auto whitespace-nowrap">
          {formattedDate}
        </div>
      </div>
      <Handle type="source" position={Position.Left} />
    </>
  );
}

function CanvasInner(props: { nodes: Record<string, TNode> }) {
  const stateManager = useContext(StateManagerContext);
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
      console.log(out);
      return out;
    });
    setEdges(initialEdges);
    window.requestAnimationFrame(() => {
      fitView();
    });
  }, [initialNodes, initialEdges, nodesInitialized]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => {
      return applyNodeChanges(changes, nds);
    }),
    [setNodes],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => {
      console.log(changes);
      return applyEdgeChanges(changes, eds);
    }),
    [setEdges],
  );

  const onConnect = useCallback((connection: {source: string, target: string}) => {
    const from = connection.source;
    const to = connection.target;
    if (!from || !to) {
      return;
    }
    stateManager?.addEdge(from, to);
  }, [stateManager]);

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
      <Background color="white" />
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

export function Canvas(props: { nodes: Record<string, TNode> }) {
  return (
    <ReactFlowProvider>
      <CanvasInner nodes={props.nodes} />
    </ReactFlowProvider>
  );
}

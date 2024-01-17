import { useMemo, useState } from "react";
import { Edge, Node, useNodesInitialized } from "reactflow";
import * as dagre from "@dagrejs/dagre";
import * as React from "react";
import { useToposorterState } from "./ToposorterState";

export const NodesContext = React.createContext<Node[]>([]);
export const EdgesContext = React.createContext<Edge[]>([]);

export const CanvasManagerContext = React.createContext<CanvasManager | null>(
  null
);

export class CanvasManager {
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;

  constructor(
    readonly data: {
      setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
      setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
      initialEdgesRef: React.RefObject<Edge[]>;
      g: dagre.graphlib.Graph;
    }
  ) {
    this.setNodes = data.setNodes;
    this.setEdges = data.setEdges;
  }



  layoutNodes() {
    this.data.setNodes((nodes) => {
      return getLayoutedElements(
        this.data.g,
        nodes,
        this.data.initialEdgesRef.current!
      ).nodes;
    });
  }
}

export function CanvasController(props: { children: React.ReactNode }) {
  const state = useToposorterState();
  const tNodes = state.getNodes();
  const nodesInitialized = useNodesInitialized();

  const g = useMemo(
    () => new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({})),
    []
  );

  const [initialNodes, initialEdges] = useMemo(() => {
    const initialNodes = [];
    const initialEdges = [];
    for (const [id, node] of Object.entries(tNodes)) {
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
  }, [tNodes]);
  const initialEdgesRef = React.useRef(initialEdges);
  const initialNodesRef = React.useRef(initialNodes);
  React.useEffect(() => {
    initialEdgesRef.current = initialEdges;
    initialNodesRef.current = initialNodes;
  }, [initialEdges, initialNodes]);

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const canvasManager = useMemo(
    () => new CanvasManager({ g, setNodes, setEdges, initialEdgesRef }),
    // () => ({ setNodes, setEdges}),
    [g, setNodes, setEdges, initialEdgesRef]
  );

  const [shouldLayout, setShouldLayout] = useState(true);

  // updates canvas nodes from upstream changes
  React.useEffect(() => {
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
      if (shouldLayout) {
        out = getLayoutedElements(g, out, initialEdges).nodes;
        setShouldLayout(false);
      }
      return out;
    });

    setEdges(initialEdges);
  }, [initialNodes, initialEdges, nodesInitialized]);

  return (
    <CanvasManagerContext.Provider value={canvasManager}>
      <NodesContext.Provider value={nodes}>
        <EdgesContext.Provider value={edges}>
          {props.children}
        </EdgesContext.Provider>
      </NodesContext.Provider>
    </CanvasManagerContext.Provider>
  );
}
function getLayoutedElements(
  g: dagre.graphlib.Graph,
  nodes: Node[],
  edges: Edge[]
) {
  g.setGraph({
    rankdir: "RL",
    align: "UL",
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

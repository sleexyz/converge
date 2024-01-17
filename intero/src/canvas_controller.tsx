import { useMemo, useState } from "react";
import {
  Edge,
  Node,
  ReactFlowInstance,
  useNodesInitialized,
  useReactFlow,
} from "reactflow";
import * as dagre from "@dagrejs/dagre";
import * as React from "react";
import { TNodeRow, useToposorterState } from "./ToposorterState";
import { SelectedNodeRefContext } from "./Selection";

export const NodesContext = React.createContext<Node[]>([]);
export const EdgesContext = React.createContext<Edge[]>([]);

export const CanvasManagerContext = React.createContext<CanvasManager | null>(
  null
);

function useStateAsync<T>(initial: T) {
  const [state, _setState] = useState(initial);

  const resolveQueueRef = React.useRef<(() => void)[]>([]);
  function pushQueue(resolve: () => void) {
    resolveQueueRef.current.push(resolve);
  }
  function resetQueue() {
    resolveQueueRef.current = [];
  }
  function consumeQueue() {
    const queue = resolveQueueRef.current;
    resetQueue();
    for (const resolve of queue) {
      resolve();
    }
  }

  React.useEffect(() => {
    consumeQueue();
  }, [state]);

  const setState = React.useCallback(
    (newState: React.SetStateAction<T>) => {
      _setState(newState);
      return new Promise<void>((resolve) => {
        pushQueue(resolve);
      });
    },
    [_setState, resolveQueueRef]
  );
  return [state, setState] as const;
}

export class CanvasManager {
  setNodes: (action: React.SetStateAction<Node[]>) => Promise<void>;
  setEdges: (action: React.SetStateAction<Edge[]>) => Promise<void>;

  constructor(
    readonly data: {
      setNodes: (action: React.SetStateAction<Node[]>) => Promise<void>;
      setEdges: (action: React.SetStateAction<Edge[]>) => Promise<void>;
      initialEdgesRef: React.RefObject<Edge[]>;
      g: dagre.graphlib.Graph;
      reactFlow: ReactFlowInstance;
      selectedNodeRef: React.RefObject<TNodeRow | null>;
    }
  ) {
    this.setNodes = data.setNodes;
    this.setEdges = data.setEdges;
  }

  async layoutNodes() {
    const { setNodes, g, initialEdgesRef } = this.data;
    await setNodes((nodes) => {
      return getLayoutedElements(g, nodes, initialEdgesRef.current!).nodes;
    });
    this.centerSelected();
  }

  private centerSelected() {
    const { reactFlow, selectedNodeRef } = this.data;
    if (!selectedNodeRef.current) {
      return;
    }
    console.log("fitting view", reactFlow, selectedNodeRef.current.id);
    reactFlow.fitView({
      nodes: [{ id: selectedNodeRef.current.id }],
      minZoom: 1,
      maxZoom: 1,
      // duration: 800,
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

  const [nodes, setNodes] = useStateAsync<Node[]>(initialNodes);
  const [edges, setEdges] = useStateAsync<Edge[]>(initialEdges);
  const reactFlow = useReactFlow();

  const selectedNodeRef = React.useContext(SelectedNodeRefContext)!;

  const canvasManager = useMemo(
    () => {
      return new CanvasManager({
        g,
        setNodes,
        setEdges,
        reactFlow,
        initialEdgesRef,
        selectedNodeRef,
      });
    },
    [g, setNodes, setEdges, reactFlow, initialEdgesRef, selectedNodeRef]
  );

  const [isInitialPass, setIsInitialPass] = useState(true);

  // initial layout:
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
      return Object.values({ ...obj, ...overwrite });
    });

    if (isInitialPass) {
      canvasManager.layoutNodes();
      setIsInitialPass(false);
      setEdges(initialEdges);
    }
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

function cache(fn: (...args: any[]) => any) {
  let lastArgs: any[] = [];
  let lastValue: any = undefined;
  return (...args: any[]) => {
    for (const [i, arg] of args.entries()) {
      if (arg !== lastArgs[i]) {
        lastArgs = [...args];
        let out = fn(...args);
        lastValue = out;
        return out;
      }
    }
    return lastValue;
  };
}

const getLayoutedElements = (
  g: dagre.graphlib.Graph,
  nodes: Node[],
  edges: Edge[]
) => {
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
};

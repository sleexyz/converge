import { useMemo } from "react";
import {
  Edge,
  Node,
  ReactFlowInstance,
  useNodesInitialized,
  useReactFlow,
} from "reactflow";
import * as dagre from "@dagrejs/dagre";
import * as React from "react";
import {
  Id,
  Status,
  TNode,
  TNodeRow,
  Toposorter,
  compareNodes,
  compareVecs,
  useToposorterState,
} from "./ToposorterState";
import { SelectedNodeRefContext, useSelectedNode } from "./Selection";
import { useMakeStateAsync, useRefState, useResolveQueue } from "./state";
import { v4 as uuidv4 } from "uuid";
import CustomNodeStyles from "./custom_node.module.css";

export const NodesContext = React.createContext<Node[]>([]);
export const EdgesContext = React.createContext<Edge[]>([]);

export const CanvasManagerContext = React.createContext<CanvasManager | null>(
  null
);

interface CanvasState {
  nodes: Node[];
  edges: Edge[];
}

export class CanvasManager {
  setNodes: (action: React.SetStateAction<Node[]>) => Promise<void>;
  setEdges: (action: React.SetStateAction<Edge[]>) => Promise<void>;
  waitForPropagation: () => Promise<void>;

  constructor(
    private readonly data: {
      canvasStateRef?: React.RefObject<CanvasState>;
      setNodes: (action: React.SetStateAction<Node[]>) => Promise<void>;
      setEdges: (action: React.SetStateAction<Edge[]>) => Promise<void>;
      g: dagre.graphlib.Graph;
      reactFlow: ReactFlowInstance;
      selectedNodeRef: React.RefObject<TNodeRow | null>;
      waitForPropagation: () => Promise<void>;
    }
  ) {
    this.setNodes = data.setNodes;
    this.setEdges = data.setEdges;
    this.waitForPropagation = data.waitForPropagation;
  }

  async layoutNodes() {
    const { setNodes, g, canvasStateRef } = this.data;
    await setNodes((nodes) => {
      return getLayoutedElements(g, nodes, canvasStateRef!.current!.edges)
        .nodes;
    });
  }

  async layoutNodesAndCenterSelected() {
    await this.layoutNodes();
    const selected = this.data.selectedNodeRef.current;
    if (!selected) {
      return;
    }
    this.center(selected.id);
  }

  center(id: Id) {
    this.data.reactFlow.fitView({
      nodes: [{ id: id }],
      minZoom: 1,
      maxZoom: 1,
      duration: 800,
    });
  }

  findNodes(query: string): Node[] {
    const lowerCaseQuery = query.toLowerCase();
    return (
      this.data.canvasStateRef?.current?.nodes.filter((node) =>
        node.data.value.toLowerCase().includes(lowerCaseQuery)
      ) || []
    );
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
    let entries = Object.entries(tNodes);
    entries = orderNodes(entries);

    for (const [id, node] of entries) {
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
          // type: "smoothstep",
          type: "bezier",
          className: CustomNodeStyles.edge,
        }))
      );
    }
    return [initialNodes, initialEdges];
  }, [tNodes]);

  const [_canvasState, _setCanvasState, canvasStateRef] = useRefState<{
    nodes: Node[];
    edges: Edge[];
  }>(() => ({
    nodes: initialNodes,
    edges: initialEdges,
  }));

  const [canvasState, setCanvasState] = useMakeStateAsync([
    _canvasState,
    _setCanvasState,
  ]);
  const { nodes, edges } = canvasState;

  const setNodes = React.useCallback(
    (action: React.SetStateAction<Node[]>) => {
      return setCanvasState((state) => {
        return {
          ...state,
          nodes: typeof action === "function" ? action(state.nodes) : action,
        };
      });
    },
    [setCanvasState]
  );

  const setEdges = React.useCallback(
    (action: React.SetStateAction<Edge[]>) => {
      return setCanvasState((state) => {
        return {
          ...state,
          edges: typeof action === "function" ? action(state.edges) : action,
        };
      });
    },
    [setCanvasState]
  );

  const reactFlow = useReactFlow();

  const selectedNodeRef = React.useContext(SelectedNodeRefContext)!;

  const resolveQueue = useResolveQueue();

  const canvasManager = useMemo(() => {
    return new CanvasManager({
      g,
      setNodes,
      setEdges,
      reactFlow,
      selectedNodeRef,
      waitForPropagation: resolveQueue.waitOnConsume,
      canvasStateRef,
    });
  }, [
    g,
    setNodes,
    setEdges,
    reactFlow,
    selectedNodeRef,
    resolveQueue,
    canvasStateRef,
  ]);

  // Sync effect:
  // - Loads initial nodes from upstream state.
  // - Updates canvas nodes from upstream changes.
  const [synced, setSynced] = React.useState(false);
  const syncStartRunIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    setSynced(false);
    const syncStartRunId = uuidv4();
    syncStartRunIdRef.current = syncStartRunId;
    if (!nodesInitialized) {
      return;
    }
    (async () => {
      await setCanvasState(({ nodes }) => {
        const newNodes: Node[] = [];
        const oldNodes = Object.fromEntries(
          nodes.map((node) => [node.id, node])
        );

        // iterate with the new ordering
        for (const node of initialNodes) {
          newNodes.push({
            ...node,
            // Overwrite position and other data.
            ...(oldNodes[node.id] || {}),
            // Carry updated data over.
            ...{ data: node.data },
          });
        }

        return {
          nodes: newNodes,
          edges: initialEdges,
        };
      });
      // signal upstream sync complete only if this is the latest update
      if (syncStartRunId !== syncStartRunIdRef.current) {
        return;
      }
      resolveQueue.consume();
      setSynced(true);
    })();
  }, [initialNodes, initialEdges, nodesInitialized]);

  useSelectActiveOnMount(canvasManager, synced);

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

function useSelectActiveOnMount(canvasManager: CanvasManager, synced: boolean) {
  const state = useToposorterState();
  const activeNode = state.getActiveNode();
  const [, setSelectedNode] = useSelectedNode();

  const hasRunRef = React.useRef(false);

  React.useEffect(() => {
    if (!synced) {
      return;
    }
    if (hasRunRef.current) {
      return;
    }
    const id = activeNode?.id;
    if (!id) {
      canvasManager.layoutNodes();
      return;
    }
    (async () => {
      await setSelectedNode(id);
      await canvasManager.layoutNodes();
      canvasManager.center(id);
      hasRunRef.current = true;
    })();
  }, [synced]);
}

// Ranks nodes and rearranges children ordering
function orderNodes(entries: [string, TNode][]): [string, TNode][] {
  // rank nodes
  let out = [...entries];
  // out = Toposorter.sort(entries);
  // let out = entries;
  out = out.sort(([_keyA, a], [_keyB, b]) => {
    return compareVecs(a.__maxVec!, b.__maxVec!);
  });

  // Re-order edges in place
  const nodeIndicies = new Map<string, number>();
  for (let [i, [id]] of out.entries()) {
    nodeIndicies.set(id, i);
  }

  const newOut: [string, TNode][] = [];

  for (let [i, node] of out) {
    const newNode = { ...node };
    newNode.children = [...node.children].sort((a, b) => {
      const aIndex = nodeIndicies.get(a);
      const bIndex = nodeIndicies.get(b);
      if (aIndex === undefined || bIndex === undefined) {
        throw new Error(`Could not find index for ${a} or ${b}`);
      }
      return aIndex - bIndex;
    });
    newOut.push([i, newNode]);
  }

  return newOut;
}

const getLayoutedElements = (
  _g: dagre.graphlib.Graph,
  nodes: Node<TNode>[],
  edges: Edge[]
) => {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  // reset positions
  for (const node of nodes) {
    node.position = { x: 0, y: 0 };
  }

  // apply layout
  g.setGraph({
    rankdir: "LR",
    align: "UL",
    // ranker: "tight-tree",
    ranker: 'longest-path',
    ranksep: 12,
    edgesep: 0,
    nodesep: 0,
  });
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }
  for (const node of nodes) {
    g.setNode(node.id, node as any);
  }
  dagre.layout(g, {
    disableOptimalOrderHeuristic: true,
  });
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

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useOnSelectionChange, useStoreApi } from "reactflow";
import { Id, TNodeRow, ToposorterStateManagerContext } from "./ToposorterState";
import { useRefState, useResolveQueue } from "./state";

const SelectedNodeContext = createContext<
  [TNodeRow|null, (id: Id | null) => Promise<void>] | null
>(null);

export class SelectionManager {
  constructor(readonly setSelectedNode: (id: Id | null) => Promise<void>, readonly setRelevantNodes: (nodes: Set<Id> | null) => void) {
  }
}

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const toposorterStateManager = useContext(ToposorterStateManagerContext)!;

  const [selectedNode, _setSelectedNode] =
    useState<Id| null>(() => null);

  const [relevantNodes, setRelevantNodes] =
    useState<Set<Id> | null>(() => null);

  const store = useStoreApi();

  const queue = useResolveQueue();

  useEffect(() => {
    queue.consume();
  }, [selectedNode]);

  const setSelectedNode = useCallback(
    (id: Id | null): Promise<void> => {
      if (!id) {
        _setSelectedNode(null);
        return queue.waitOnConsume();
      }
      _setSelectedNode(id);

      // console.log("selected node", row);
      const { addSelectedNodes } = store.getState();
      addSelectedNodes([id]);
      return queue.waitOnConsume();
    },
    [_setSelectedNode, toposorterStateManager]
  );

  useOnSelectionChange({
    onChange: ({ nodes }) => {
      const node = nodes.length > 0 ? nodes[0] : null;
      if (node) {
        setSelectedNode(node.id);
      }
    },
  });

  const toposorterState = useContext(ToposorterStateManagerContext)!;
  let nodeRow: TNodeRow | null = null;
  if (selectedNode) { 
    nodeRow = {
      id: selectedNode,
      data: toposorterState.state().getNode(selectedNode)
    };
  }

  const selectedNodeRef = useRef<TNodeRow | null>(nodeRow);

  const ret = useMemo(() => {
    selectedNodeRef.current = nodeRow;
    return [nodeRow, setSelectedNode] as [
      TNodeRow|null,
      (id: Id | null) => Promise<void>
    ];
  }, [nodeRow, setSelectedNode]);

  const selectionManager = useMemo(() => {
    return new SelectionManager(setSelectedNode, setRelevantNodes)
  }, [setSelectedNode, setRelevantNodes]);

  return (
    <SelectedNodeContext.Provider value={ret}>
      <SelectedNodeRefContext.Provider value={selectedNodeRef}>
        <RelevantNodesContext.Provider value={relevantNodes}>
          <SelectionManagerContext.Provider value={selectionManager}>
            {children}
          </SelectionManagerContext.Provider>
        </RelevantNodesContext.Provider>
      </SelectedNodeRefContext.Provider>
    </SelectedNodeContext.Provider>
  );
}

export const SelectionManagerContext = createContext<SelectionManager | null>(null);

export const SelectedNodeRefContext =
  createContext<React.MutableRefObject<TNodeRow | null> | null>(null);

export const RelevantNodesContext = createContext<Set<Id> | null>(null);

export function useSelectedNode() {
  return useContext(SelectedNodeContext)!;
}

export function useIsRelevantNode(id: Id): null | boolean {
  const relevantNodes = useContext(RelevantNodesContext)!;
  if (relevantNodes === null) {
    return null;
  }
  return relevantNodes?.has(id);
}

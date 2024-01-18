import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useOnSelectionChange, useStoreApi } from "reactflow";
import { Id, TNodeRow, ToposorterStateManagerContext } from "./ToposorterState";
import { useRefState, useResolveQueue } from "./state";

const SelectedNodeContext = createContext<
  [TNodeRow, (id: Id | null) => Promise<void>] | null
>(null);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const toposorterStateManager = useContext(ToposorterStateManagerContext)!;

  const [selectedNode, _setSelectedNode, selectedNodeRef] =
    useRefState<TNodeRow | null>(() => null);

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
      const row = {
        data: toposorterStateManager.state().getNode(id),
        id,
      };
      _setSelectedNode(row);
      console.log("selected node", row);
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

  const ret = useMemo(() => {
    return [selectedNode, setSelectedNode] as [
      TNodeRow,
      (id: Id | null) => Promise<void>
    ];
  }, [selectedNode, setSelectedNode]);

  return (
    <SelectedNodeContext.Provider value={ret}>
      <SelectedNodeRefContext.Provider value={selectedNodeRef}>
        {children}
      </SelectedNodeRefContext.Provider>
    </SelectedNodeContext.Provider>
  );
}

export const SelectedNodeRefContext =
  createContext<React.MutableRefObject<TNodeRow | null> | null>(null);

export function useSelectedNode() {
  return useContext(SelectedNodeContext)!;
}

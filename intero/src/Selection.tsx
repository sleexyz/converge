import { SetStateAction, createContext, useCallback, useContext, useMemo, useState } from "react";
import { useOnSelectionChange, useStoreApi } from "reactflow";
import { Id, TNodeRow, ToposorterStateManagerContext } from "./ToposorterState";

const SelectedNodeContext = createContext<[TNodeRow, React.Dispatch<SetStateAction<Id|null>>] | null>(null);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const toposorterStateManager = useContext(ToposorterStateManagerContext)!;

  const [selectedNode, setSelectedNodeRaw] = useState<TNodeRow |null>(null);

  const store = useStoreApi();
 

  const setSelectedNode = useCallback((id: Id | null) => {
    if (!id) {
      setSelectedNodeRaw(null);
      return;
    }
    const row = {
      data: toposorterStateManager.state().getNode(id),
      id,
    };
    setSelectedNodeRaw(row);
    const { addSelectedNodes, resetSelectedElements } = store.getState();
    // resetSelectedElements();
    addSelectedNodes([id]);
  }, [setSelectedNodeRaw, toposorterStateManager]);

  useOnSelectionChange({
    onChange: ({ nodes }) => {
        const node = nodes.length > 0 ? nodes[0] : null;
        if (node) {
            setSelectedNode(node.id);
        }
    },
  });

  const ret = useMemo(() => {
    return [
      selectedNode,
      setSelectedNode,
    ] as [
        TNodeRow,
        React.Dispatch<SetStateAction<Id|null>>,
    ];
  }, [selectedNode, setSelectedNode]);

  return (
    <SelectedNodeContext.Provider value={ret}>
      {children}
    </SelectedNodeContext.Provider>
  );
}

export function useSelectedNode() {
  return useContext(SelectedNodeContext)!;
}

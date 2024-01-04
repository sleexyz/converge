import { SetStateAction, createContext, useContext, useMemo, useState } from "react";
import { useOnSelectionChange } from "reactflow";
import { TNodeRow } from "./ToposorterState";

const SelectedNodeContext = createContext<[TNodeRow, React.Dispatch<SetStateAction<TNodeRow|null>>] | null>(null);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedNode, setSelectedNode] = useState<TNodeRow |null>(null);

  useOnSelectionChange({
    onChange: ({ nodes }) => {
        const node = nodes.length > 0 ? nodes[0] : null;
        if (node) {
            setSelectedNode(node);
        }
    },
  });

  const ret = useMemo(() => {
    return [
      selectedNode,
      setSelectedNode,
    ] as [
        TNodeRow,
        React.Dispatch<SetStateAction<TNodeRow|null>>,
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

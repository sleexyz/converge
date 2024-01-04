import { createContext, useContext, useState } from "react";
import { Node, useOnSelectionChange } from "reactflow";

const SelectedNodeContext = createContext<Node | null>(null);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedNode, setSelectedNode] = useState<Node|null>(null);

  useOnSelectionChange({
    onChange: ({ nodes }) => {
        const node = nodes.length > 0 ? nodes[0] : null;
        if (node) {
            setSelectedNode(node);
        }
    },
  });

  return (
    <SelectedNodeContext.Provider value={selectedNode}>
      {children}
    </SelectedNodeContext.Provider>
  );
}

export function useSelectedNode() {
  return useContext(SelectedNodeContext)!;
}

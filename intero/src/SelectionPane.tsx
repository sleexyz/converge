import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Edge, Node, useOnSelectionChange } from "reactflow";
import { Id, StateManagerContext, TNode } from "./ToposorterState";
import ReactTextareaAutosize from "react-textarea-autosize";
import { format } from "date-fns";
import { CommandLine } from "./CommandLine";

// Only update the value when it is not null
function useLastValue<T>(value: T | null): T | null {
  const ref = useRef<T | null>(null);
  if (value) {
    ref.current = value;
  }
  return ref.current!;
}

export function SelectionPane() {
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);
  useOnSelectionChange({
    onChange: ({ nodes, edges }) => {
      setSelectedNodes(nodes);
      setSelectedEdges(edges);
    },
  });

  const selectedNode = selectedNodes.length > 0 ? selectedNodes[0] : null;

  const lastSelectedNode = useLastValue(selectedNode);
  const tnode = lastSelectedNode?.data as TNode | null;

  let borderColor =
    selectedNode == null ? "border-transparent" : "border-indigo-500";
  borderColor = "border-transparent";

  return (
    <div
      className={`flex-1 flex flex-col bg-black w-full rounded-xl p-8 border ${borderColor} justify-between`}
    >
      <div className="flex flex-col items-stretch">
        {tnode && <SelectionEditor tnode={tnode} id={lastSelectedNode!.id} />}
      </div>
      <CommandLine />
    </div>
  );
}

function SelectionEditor({ tnode, id }: { tnode: TNode; id: Id }) {
  const stateManager = useContext(StateManagerContext)!;
  const [nodeValue, setNodeValue] = useState<string | null>(null);

  // Update nodeValue when selectedNode changes
  useEffect(() => {
    if (tnode) {
      setNodeValue(tnode.value);
    }
  }, [tnode]);

  // Handle nodeValue change
  const handleNodeValueChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setNodeValue(event.target.value);
    // Update the node value in the state manager
    // Assuming there's a method updateNode in stateManager
    stateManager.setValue(id, event.target.value);
  };

  // Format as "September 5, 2021 at 12:00 PM"
  const formattedDate = format(tnode.createdAt, "MMMM d, yyyy 'at' h:mm a");

  return (
    <>
      <div className="space-y-4 flex flex-col">
        <ReactTextareaAutosize
          value={nodeValue || ""}
          onChange={handleNodeValueChange}
          placeholder="Node value"
          className="text-left box-content text-2xl rounded-md shadow-sm opacity-80 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-500 border-gray-600 m-0 p-2 border"
        />
        <span className="text-sm text-gray-500">Created on {formattedDate}</span>
      </div>
    </>
  );
}

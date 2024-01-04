import { useContext, useEffect, useState } from "react";
import { Id, StateManagerContext, TNode, ToposorterStateContext } from "./ToposorterState";
import ReactTextareaAutosize from "react-textarea-autosize";
import { format } from "date-fns";
import { CommandLine } from "./CommandLine";
import { useSelectedNode } from "./Selection";

export function SelectionPane() {
  const [selectedNode] = useSelectedNode();
  const tnode = selectedNode?.data as TNode | undefined;

  return (
    <div
      className={`flex-1 flex flex-col bg-black w-full rounded-xl p-8 justify-between`}
    >
      <div className="flex flex-col items-stretch">
        {tnode && <SelectionEditor tnode={tnode} id={selectedNode!.id} />}
      </div>
      <CommandLine />
    </div>
  );
}

function SelectionEditor({ tnode, id }: { tnode: TNode; id: Id }) {
  const state = useContext(ToposorterStateContext)!;
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
    const node = state.reconcileId(id);
    stateManager.setValue(node, event.target.value);
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
        <span className="text-sm text-gray-500">
          Created on {formattedDate}
        </span>
      </div>
    </>
  );
}

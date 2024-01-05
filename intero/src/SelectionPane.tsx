import { useCallback, useContext, useEffect, useState } from "react";
import { Id, StateManagerContext, TNode } from "./ToposorterState";
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
  const stateManager = useContext(StateManagerContext)!;
  const [value, setValue] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);

  // Update nodeValue when selectedNode changes
  useEffect(() => {
    if (tnode) {
      setValue(tnode.value);
      setNotes(tnode.notes ?? null);
    }
  }, [tnode]);

  const handleValueChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(event.target.value);
      stateManager.setValue(id, event.target.value);
    },
    [stateManager, id]
  );

  const handleNotesChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNotes(event.target.value);
      stateManager.setNotes(id, event.target.value);
    },
    [stateManager, id]
  );

  // Format as "September 5, 2021 at 12:00 PM"
  const formattedDate = format(tnode.createdAt, "MMMM d, yyyy 'at' h:mm a");

  return (
    <>
      <div className="space-y-8 flex flex-col">
        <div className="space-y-4 flex flex-col">
          <ReactTextareaAutosize
            value={value || ""}
            onChange={handleValueChange}
            placeholder="Title"
            className="text-left box-content text-2xl rounded-md shadow-sm opacity-80 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-500 border-gray-600 m-0 p-2 border"
          />
          <span className="text-sm text-gray-500">
            Created on {formattedDate}
          </span>
        </div>
        <ReactTextareaAutosize
          value={notes || ""}
          onChange={handleNotesChange}
          minRows={5}
          className="text-left box-content text-lg rounded-md shadow-sm opacity-80 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-500 border-gray-600 m-0 p-2 border"
        />
      </div>
    </>
  );
}

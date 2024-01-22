import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Id, ToposorterStateManagerContext, TNode } from "./ToposorterState";
import ReactTextareaAutosize from "react-textarea-autosize";
import { format } from "date-fns";
import { useSelectedNode } from "./Selection";
import { UIStateContext } from "./ui_state";

export function SelectionPane() {
  const [selectedNode] = useSelectedNode();
  const tnode = selectedNode?.data as TNode | undefined;

  return (
    <div
      className="bg-white h-[80vmin] border-1 border-gray-100 flex-1 flex flex-col w-full rounded-xl p-8 justify-between shadow-xl"
    >
      <div className="flex flex-col items-stretch">
        {tnode && <SelectionEditor tnode={tnode} id={selectedNode!.id} />}
      </div>
    </div>
  );
}

function SelectionEditor({ tnode, id }: { tnode: TNode; id: Id }) {
  const stateManager = useContext(ToposorterStateManagerContext)!;
  const [value, setValue] = useState<string | null>(() => null);
  const [notes, setNotes] = useState<string | null>(() => null);

  // Update nodeValue when selectedNode changes
  useEffect(() => {
    if (tnode) {
      setValue(tnode.value);
      setNotes(tnode.notes ?? null);
    }
  }, [tnode]);

  const handleValueChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setValue(event.target.value);
      stateManager.setValue(id, event.target.value);
    },
    [stateManager,  id]
  );

  const handleNotesChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNotes(event.target.value);
      stateManager.setNotes(id, event.target.value);
    },
    [stateManager, id]
  );

  const titleRef = useRef<HTMLInputElement>(null);
  const uiState = useContext(UIStateContext)!;
  useEffect(() => {
    uiState.bindTitleRef(titleRef);
  }, [titleRef]);

  // Format as "September 5, 2021 at 12:00 PM"
  const formattedDate = format(tnode.createdAt, "MMMM d, yyyy 'at' h:mm a");

  let typeStr: string = tnode.type ?? "task";
  typeStr = [typeStr[0].toUpperCase(), typeStr.slice(1)].join("");

  return (
    <>
      <div className="space-y-8 flex flex-col">
        <div className="space-y-4 flex flex-col">
          <input
            value={value || ""}
            onChange={handleValueChange}
            // onBlur={handleValueBlur}
            placeholder="Title"
            ref={titleRef}
            className="text-left box-content text-2xl rounded-md shadow-sm opacity-80 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-500 border-gray-600 m-0 p-2 border"
          />
          <span className="text-sm text-gray-500">
            {typeStr} created on {formattedDate}
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

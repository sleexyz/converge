import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  Id,
  ToposorterStateManagerContext,
  TNodeData,
  ToposorterStateContext,
} from "./ToposorterState";
import ReactTextareaAutosize from "react-textarea-autosize";
import { formatDistanceToNow } from "date-fns";
import { useSelectedNode } from "./Selection";
import { UIStateContext } from "./ui_state";
import "./selection_pane.css";

export function SelectionPane() {
  const [selectedNode] = useSelectedNode();
  const tnode = selectedNode?.data as TNodeData | undefined;

  return (
    <div className="h-max-[80vmin] flex flex-col mt-2 w-80 items-stretch justify-stretch shadow-xl rounded-2xl bg-white bg-opacity-75 border border-gray-300 p-2 space-y-2">
      <div className="p-2 flex flex-col items-stretch bg-white h-full rounded-2xl border-gray-300 border">
        {tnode && <SelectionEditor tnode={tnode} id={selectedNode!.id} />}
      </div>
    </div>
  );
}

function SelectionEditor({ tnode, id }: { tnode: TNodeData; id: Id }) {
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

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const uiState = useContext(UIStateContext)!;
  useEffect(() => {
    uiState.bindTitleRef(titleRef);
  }, [titleRef]);

  const formattedDate = formatDistanceToNow(tnode.createdAt, {
    addSuffix: true,
  });

  return (
    <>
      <div className="space-y-2 flex flex-col">
        <ReactTextareaAutosize
          value={value || ""}
          onChange={handleValueChange}
          placeholder="Untitled"
          ref={titleRef}
          className="text-left box-content text-2xl rounded-md p-2 border-none shadow-none outline-none resize-none"
        />
        <ReactTextareaAutosize
          value={notes || ""}
          onChange={handleNotesChange}
          minRows={5}
          placeholder="Notes"
          className="text-gray-500 text-left box-content text-lg rounded-md p-2 m-0 border-0 outline-none resize-none"
        />

        <span className="px-2 text-sm py-4 text-gray-500">
          Created {formattedDate}
        </span>

        <hr />

        <div className="p-2 flex justify-between items-center text-sm">
          <label className="text-gray-500">Estimated time (min)</label>
          <input
            className="text-gray-500 bg-white border border-gray-300 rounded-md p-2 m-0 min-w-0"
            type="number"
            value={tnode.estimatedTime ?? 0}
            onChange={(e) => {
              stateManager.setEstimatedTime(id, parseInt(e.target.value));
            }}
          ></input>
        </div>
      </div>
    </>
  );
}

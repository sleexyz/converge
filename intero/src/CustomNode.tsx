import { useContext } from "react";
import { UIStateContext } from "./ui_state";
import { Handle, Position } from "reactflow";
import { TNode } from "./ToposorterState";

export function CustomNode(props: { data: TNode; id: string; selected: boolean }) {
    let classes = "";
  
    if (props.data.status === "done") {
      classes = "bg-slate-800 text-white";
    } else if (props.data.status === "active") {
      classes = "bg-slate-500 text-white";
    } else {
      classes = "bg-black text-white";
      classes += " border-dashed";
    }
  
    if (props.selected) {
      classes += " border-2 border-indigo-500";
    } else {
      classes += " border-2 border-gray-500";
    }

    const uiState = useContext(UIStateContext)!;
  
    function handleOnClick() {
      uiState.rotateFocus(props.id);
    }

    let title = props.data.value
    if (title == "") {
      title = "Untitled";
      // make italic
      classes += " italic";
    }

    return (
      <>
        <Handle type="target" position={Position.Right} />
        <div
          className={` box-content p-2 rounded-2xl ${classes}`}
          onClick={handleOnClick}
        >
          {title}
          {/* <div className="font-mono absolute top-[-15px] right-[-25px] text-gray-500 font-bold rounded-full px-2 py-1 text-xs">
            {chipText}
          </div> */}
        </div>
        <div></div>
        <Handle type="source" position={Position.Left} />
      </>
    );
  }
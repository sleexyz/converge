import { useContext } from "react";
import { UIStateContext } from "./ui_state";
import { Handle, Position } from "reactflow";
import { TNode, ToposorterStateManagerContext } from "./ToposorterState";
import CustomNodeStyles from "./custom_node.module.css";
import { SelectionManagerContext, useIsRelevantNode } from "./Selection";

export function CustomNode(props: {
  data: TNode;
  id: string;
  selected: boolean;
}) {

  let isRelevant = useIsRelevantNode(props.id);
  
  let classes = `${CustomNodeStyles.node}`;
  let chipText = "";

  if (props.data.status === "done") {
    classes += ` ${CustomNodeStyles.done}`;
  } else if (props.data.status === "active") {
    classes += ` ${CustomNodeStyles.active}`;
  } else {
    classes += ` ${CustomNodeStyles.unset}`;
  }

  if (props.selected) {
    classes += ` ${CustomNodeStyles.selected}`;
  }

  if (isRelevant !== null && !isRelevant) {
    classes += ` opacity-30`;
  }

  const uiState = useContext(UIStateContext)!;

  const toposorterStateManager = useContext(ToposorterStateManagerContext)!;
  const selectionManager = useContext(SelectionManagerContext)!;

  function handleOnClick() {
    uiState.rotateFocus(props.id, selectionManager, toposorterStateManager);
  }

  let title = props.data.value;
  if (title == "") {
    title = "Untitled";
    // make italic
    classes += " italic";
  }

  if (props.data.type === "project") {
    classes += ` ${CustomNodeStyles.project}`;
  }

  if (props.data.type === "goal") {
    classes += ` ${CustomNodeStyles.goal}`;
  }

  if (props.data.type === "problem") {
    classes += ` ${CustomNodeStyles.problem}`;
  }

  if (props.data.type === "task" || props.data.type == null) {
    classes += ` ${CustomNodeStyles.task}`;
  }

  let priorityText = "";
  if (props.data.priority != null) {
    if (props.data.priority === 0) {
      priorityText = "!";
    } else {
      priorityText = "∘".repeat(props.data.priority);
    }
  }

  return (
    <>
      <Handle type="target" position={Position.Left} className={CustomNodeStyles.handle}/>
      <div
        className={`${classes}`}
        onClick={handleOnClick}
      >
        {title}
        {props.data.status === "active" && (
          <Chip className="top-[-10px] right-[-10px] bg-gray-500 text-white" >
            <ActiveSvg />
          </Chip>
        )}
        <div className="absolute top-[-10px] left-4 text-gray-300 text-xl">
          {priorityText}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className={CustomNodeStyles.handle}/>
    </>
  );
}

function Chip(props: { children: React.ReactNode; className?: string }) {
  return (
    <div className={["font-mono absolute font-bold rounded-full text-x h-6 w-6 flex justify-center items-center z-50", props.className].join(' ')}>
      {props.children}
    </div>
  );
}

function ActiveSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="w-3 h-3"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
      />
    </svg>
  );
}

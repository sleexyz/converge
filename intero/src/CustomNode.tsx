import { useContext } from "react";
import { UIStateContext } from "./ui_state";
import { Handle, Position } from "reactflow";
import { TNode } from "./ToposorterState";
import CustomNodeStyles from "./custom_node.module.css";

export function CustomNode(props: {
  data: TNode;
  id: string;
  selected: boolean;
}) {
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

  const uiState = useContext(UIStateContext)!;

  function handleOnClick() {
    uiState.rotateFocus(props.id);
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

  return (
    <>
      <Handle type="target" position={Position.Right} />
      <div
        className={`${classes}`}
        onClick={handleOnClick}
      >
        {title}
        {props.data.status === "active" && (
          <Chip>
            <ActiveSvg />
          </Chip>
        )}
      </div>
      <div></div>
      <Handle type="source" position={Position.Left} />
    </>
  );
}

function Chip(props: { children: React.ReactNode; className?: string }) {
  return (
    <div className="font-mono absolute top-[-15px] right-[-25px] text-gray-500 font-bold rounded-full px-2 py-1 text-xs bg-white">
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
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-4 h-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
      />
    </svg>
  );
}

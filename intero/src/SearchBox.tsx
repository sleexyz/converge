import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { CanvasManagerContext } from "./canvas_controller";
import { Node } from "reactflow";
import { ActionManagerContext } from "./action_manager";
import { useSelectedNode } from "./Selection";

export function SearchBox() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [show, setShow] = useState(false);

  const canvasManager = useContext(CanvasManagerContext)!;

  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        setShow((show) => !show);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        setShow((show) => !show);
      }
    };

    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInput(e.currentTarget.value);
    },
    [setInput]
  );

  const [matches, setMatches] = useState<Node[]>([]);

  useEffect(() => {
    if (input.length < 3) {
      setMatches([]);
      return;
    }
    setMatches(canvasManager.findNodes(input));
  }, [input]);

  const containerRef = useRef<HTMLDivElement>(null);

  onMouseDownOutside(containerRef, () => {
    setShow(false);
  });

  return (
    <>
      {show && (
        <div
          className="flex flex-col w-80 items-stretch justify-stretch"
          ref={containerRef}
        >
          <input
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            className="flex-1 bg-black bg-opacity-75 border border-gray-300 rounded-md shadow-sm py-2 px-4 block w-full min-w-full sm:text-sm basis-full"
            placeholder="Search"
            ref={inputRef}
            value={input}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setShow(false);
              }
            }}
            onChange={handleChange}
          />
          {matches.length > 0 && (
            <div className="flex-1 flex flex-col bg-black bg-opacity-75 border-gray-300 rounded-md shadow-sm py-2 w-full sm:text-sm items-stretch justify-stretch space-y-2">
              {matches.map((node) => (
                <MatchResult node={node} key={node.id} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function MatchResult(props: { node: Node }) {
  const actionManager = useContext(ActionManagerContext)!;
  const handleOnClick = useCallback(() => {
    actionManager.selectNode(props.node.id);
  }, [props.node, actionManager]);
  const [selectedNode] = useSelectedNode();
  let className =
    "p-2 select-none cursor-pointer text-sm text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 hover:text-gray-500 white-space-nowrap overflow-ellipsis min-w-0 w-full basis-full rounded-xl";
  if (props.node.id === selectedNode?.id) {
    className += " text-pink-500 hover:text-pink-600";
  }
  return (
    <a className={className} onClick={handleOnClick}>
      {props.node.data.value}
    </a>
  );
}

function onMouseDownOutside(
  containerRef: React.RefObject<HTMLElement>,
  callback: () => void
) {
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as any)) {
        return;
      }
      callback();
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("click", handleMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("click", handleMouseDown);
    };
  }, [containerRef, callback]);
}

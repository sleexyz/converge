import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { CanvasManagerContext } from "./canvas_controller";
import { Node } from "reactflow";
import { ActionManagerContext } from "./action_manager";
import { useSelectedNode } from "./Selection";
import { MatchContainer, MatchResult, SearchContainer, SearchInput, onMouseDownOutside } from "./Box";

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

  useEffect(() => {
    if (show) {
      setInput("");
    }
  }, [show]);

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
        <SearchContainer ref={containerRef}>
          <SearchInput
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
            <MatchContainer>
              {matches.map((node) => (
                <SearchMatchResult node={node} key={node.id} />
              ))}
            </MatchContainer>
          )}
        </SearchContainer>
      )}
    </>
  );
}

function SearchMatchResult(props: { node: Node }) {
  const actionManager = useContext(ActionManagerContext)!;
  const handleOnClick = useCallback(() => {
    actionManager.selectNode(props.node.id);
  }, [props.node, actionManager]);
  const [selectedNode] = useSelectedNode();
  const isSelected = selectedNode?.id === props.node.id;
  return (
    <MatchResult onClick={handleOnClick} selected={isSelected}>
      {props.node.data.value}
    </MatchResult>
  );
}
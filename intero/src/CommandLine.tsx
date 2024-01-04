import { useContext, useEffect, useRef, useState } from "react";
import { SetErrorContext, StateManagerContext } from "./ToposorterState";

export function CommandLine() {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const setError = useContext(SetErrorContext)!;

  const stateManager = useContext(StateManagerContext)!;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") {
      return;
    }
    const input = e.currentTarget.value;

    try {
      if (input.startsWith("/delete")) {
        const args = input.split(" ");
        let id = args[1];
        stateManager.deleteNode(id);
      } else if (input.startsWith("/child")) {
        const args = input.split(" ");
        let from = args[1];
        let to = args[2];
        stateManager.addEdge(from, to);
      } else if (input.startsWith("/status")) {
        const args = input.split(" ");
        let idPrefix = args[1];
        let status = args[2];
        stateManager.setStatus(idPrefix, status);
      } else if (input.startsWith("/done")) {
        const args = input.split(" ");
        let idPrefix = args[1];
        stateManager.setStatus(idPrefix, "done");
      } else if (input.startsWith("/active")) {
        const args = input.split(" ");
        let idPrefix = args[1];
        stateManager.setStatus(idPrefix, "active");
      } else if (input.startsWith("/")) {
        const args = input.split(" ");
        throw new Error(`Unknown command ${args[0]}`);
      } else {
        stateManager.addNode(input);
      }
      setError(null);
      setInput("");
    } catch (e: unknown) {
      console.error(e);
      setError(e as Error);
    }
  };

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.currentTarget) {
      setInput(e.currentTarget.value);
    }
  };

  // Set focus on command line.
  useEffect(() => {
    inputRef.current?.focus();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    function onVisibilityChange() {
      if (!document.hidden) {
        inputRef.current?.focus();
      }
    }
  }, []);

  return (
    <input
      autoFocus
      ref={inputRef}
      type="text"
      onFocus={(e) => {
        console.log("onFocus", e);
        console.log(document.activeElement);
      }}
      onBlur={(e) => {
        console.log("debugging. onblur", e);
        console.log(document.activeElement);
      }}
      placeholder="Command"
      onKeyDown={handleKeyDown}
      value={input}
      onChange={handleOnChange}
      className="mt-3 px-4 py-2 text-2xl w-full border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
    ></input>
  );
}

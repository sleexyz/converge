import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ActivityPicker } from "./ActivityPicker";
import "./App.css";
import { useGlobalShortcut } from "./use_global_shortcut";
import { ErrorBoundary } from "./ErrorBoundary";
import { produce, Draft } from "immer";
import { Canvas } from "./Canvas";
import {
  StateManagerContext,
  ToposorterState,
  ToposorterStateData,
  useLocalStorageState,
  withNormalization,
} from "./ToposorterState";
import * as React from "react";

function App() {
  useGlobalShortcut();

  return (
    <>
      <div className="fixed bg-black bg-opacity-50 h-full w-full overflow-hidden overscroll-none flex justify-start items-start">
        <ErrorBoundary>
          <ToposorterView />
        </ErrorBoundary>
        <div className="absolute bottom-0 right-0 h-[300px] overflow-y-scroll overscroll-none bg-black bg-opacity-90 rounded-xl flex flex-col-reverse">
          <ErrorBoundary>
            <ActivityPicker />
          </ErrorBoundary>
        </div>
      </div>
    </>
  );
}

function ToposorterView() {
  const [state, setState] = useLocalStorageState<ToposorterStateData>(
    "toposorter",
    {
      nodes: {},
    },
    produce((_draft: Draft<ToposorterStateData>) => {})
  );

  const [input, setInput] = useState("");
  const [error, setError] = useState<null | Error>(null);

  const trySetState = useCallback((
    fn: (value: ToposorterStateData) => ToposorterStateData
  ) => {
    setState((state) => {
      try {
        return fn(state);
      } catch (e: unknown) {
        console.error(e);
        setError(e as Error);
        return state;
      }
    });
  }, [setState, setError]);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const stateManager = useMemo(() => {
    return {
      addNode: (value: string) => {
        trySetState(withNormalization(ToposorterState.addNode(value)));
      },
      deleteNode: (idPrefix: string) => {
        trySetState(withNormalization(ToposorterState.deleteNode(idPrefix)));
      },
      addEdge: (fromPrefix: string, toPrefix: string) => {
        trySetState(withNormalization(ToposorterState.addEdge(fromPrefix, toPrefix)));
      },
      setStatus: (idPrefix: string, status: string) => {
        trySetState(withNormalization(ToposorterState.setStatus(idPrefix, status)));
      },
    };
  }, [setState, trySetState]);

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
        stateManager.setStatus(idPrefix, 'done');
      } else if (input.startsWith("/active")) {
        const args = input.split(" ");
        let idPrefix = args[1];
        stateManager.setStatus(idPrefix, 'active');
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

  return (
    <div className="flex flex-col items-start m-[2%] space-y-8 p-8 w-[60%] rounded-xl h-[96%] bg-black">
      <StateManagerContext.Provider value={stateManager}>
        <Canvas nodes={state.nodes} />
      </StateManagerContext.Provider>
      {error && (
        <pre className="bg-red-100 text-red-500 m-8 p-8 rounded-xl text-bold absolute right-0 top-0">
          Error: {error.message}
        </pre>
      )}
      <input
        ref={inputRef}
        type="text"
        placeholder="Command"
        onKeyDown={handleKeyDown}
        value={input}
        onChange={handleOnChange}
        className="mt-3 px-4 py-2 text-2xl w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      ></input>
    </div>
  );
}

export default App;

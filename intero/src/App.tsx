import { useState, useRef, useEffect } from "react";
import { ActivityPicker } from "./ActivityPicker";
import "./App.css";
import { useGlobalShortcut } from "./use_global_shortcut";
import { v4 as uuidv4 } from "uuid";
import { ErrorBoundary } from "./ErrorBoundary";
import {produce, original, Draft} from "immer";

function App() {
  useGlobalShortcut();

  return (
    <>
      <div className="fixed bg-black bg-opacity-50 h-full w-full overflow-hidden overscroll-none flex justify-start items-start">
        <ErrorBoundary>
          <Toposorter />
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

type Id = string;

interface Node {
  value: string;
  status?: "active" | "done";
  children: Id[];
}

interface ToposorterState {
  nodes: Record<Id, Node>;
}

function useLocalStorageState<T>(
  key: string,
  defaultValue: T,
  // run migrations here
  normalize: (value: T) => T = (value) => value
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    const value = localStorage.getItem(key);
    if (value) {
      return normalize(JSON.parse(value));
    }
    return defaultValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
}

function Toposorter() {
  const [state, setState] = useLocalStorageState<ToposorterState>(
    "toposorter",
    {
      nodes: {},
    }, produce((draft: Draft<ToposorterState>) => {
      const nodes = original(draft.nodes)!;
      console.log(nodes);
      for (let key in Object.keys(nodes)) {
        if (draft.nodes[key].status === undefined) {
          draft.nodes[key].status = "active";
        }
      }
    })
  );

  const [input, setInput] = useState("");
  const [error, setError] = useState<null|Error>(null);


  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") {
      return;
    }
    const input = e.currentTarget.value;

    try {
      if (input.startsWith("/delete")) {
        const args = input.split(" ");
        let id = args[1];
        deleteNode(id);
      } else if (input.startsWith("/child")) {
        const args = input.split(" ");
        let from = args[1];
        let to = args[2];
        addEdge(from, to);
      } else {
        addNode(input);
        setInput("");
      }
      setError
    } catch (e: unknown) {
      console.error(e);
      setError(e as Error);
    }
  };

  function deleteNode(idPrefix: string) {
    setState(produce((draft: Draft<ToposorterState>) => {
      // reconcile ids
      let nodes = original(draft.nodes)!;
      let id = Object.keys(nodes).find((id) => id.startsWith(idPrefix));
      if (!id) {
        throw new Error(`Could not find node with prefix ${idPrefix}`);
      }

      // Delete the node.
      delete draft.nodes[id];

      // Delete all edges to this node.
      for (const key of Object.keys(nodes)) { 
        if (key === id) {
          continue;
        }
        const newChildren = nodes[key].children.filter((childId) => childId !== id);
        draft.nodes[key].children = newChildren;
      }
    }));
  }

  function addEdge(fromPrefix: string, toPrefix: string) {
    setState(produce((draft: Draft<ToposorterState>) => {
      // reconcile ids
      let nodes = original(draft.nodes)!;
      let from = Object.keys(nodes).find((id) => id.startsWith(fromPrefix));
      let to = Object.keys(nodes).find((id) => id.startsWith(toPrefix));
      console.log(from, to)
      if (!from) {
        throw new Error(`Could not find child node with prefix ${fromPrefix}`);
      }
      if (!to) {
        throw new Error(`Could not find parent node with prefix ${toPrefix}`);
      }
      draft.nodes[from].children.push(to);
    }));
  }

  function addNode(value: string) {
    setState(produce((draft: ToposorterState) => {
      const id = uuidv4();
      draft.nodes[id] = {
        value,
        children: [],
      }
    }));
  }

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.currentTarget) {
      setInput(e.currentTarget.value);
    }
  };

  return (
    <div className="flex flex-col items-start m-20 space-y-8 p-8 w-[50%] rounded-xl h-[80%] bg-black bg-opacity-90">
      <h1 className="text-4xl text-white">Toposorter</h1>
      <pre className="flex-1">{JSON.stringify(state, null, 2)}</pre>
      {error && <pre className="text-red-500">{error.message}</pre>}

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

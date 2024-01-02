import { useState, useRef, useEffect } from "react";
import { ActivityPicker } from "./ActivityPicker";
import "./App.css";
import { useGlobalShortcut } from "./use_global_shortcut";
import { v4 as uuidv4 } from "uuid";
import { ErrorBoundary } from "./ErrorBoundary";
import { produce, original, Draft } from "immer";

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
  normalizeState: (value: T) => T = (value) => value
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    const value = localStorage.getItem(key);
    if (value) {
      return normalizeState(JSON.parse(value));
    }
    return defaultValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
}

// Returns topologically sorted nodes.
function toposort(state: ToposorterState): Id[] {
  console.log(state);
  return new Toposort(state.nodes).sort();
}

class Toposort {
  visited = new Set<Id>();

  constructor(private readonly nodes: Record<Id, Node>) {}

  // Visit all nodes.
  // Visit all of a node's children recursively before visiting a node.
  // Then insertion order should be topologically sorted.
  sort(): Id[] {
    for (let key of Object.keys(this.nodes)) {
      this.visitChildren(key);
    }
    return [...this.visited];
  }

  // DFS
  private visitChildren(key: Id) {
    const visted = this.visited.has(key);
    if (visted) {
      return;
    }

    const node = this.nodes[key];
    if (!node) {
      return;
    }
    for (let childId of node.children) {
      this.visitChildren(childId);
    }

    this.visited.add(key);
  }
}

function Toposorter() {
  const [state, setState] = useLocalStorageState<ToposorterState>(
    "toposorter",
    {
      nodes: {},
    },
    produce((_draft: Draft<ToposorterState>) => {})
  );

  const [input, setInput] = useState("");
  const [error, setError] = useState<null | Error>(null);

  function trySetState(fn: (value: ToposorterState) => ToposorterState) {
    setState((state) => {
      try {
        return fn(state);
      } catch (e: unknown) {
        setError(e as Error);
        return state;
      }
    });
  }

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
        normalize();
      } else if (input.startsWith("/child")) {
        const args = input.split(" ");
        let from = args[1];
        let to = args[2];
        addEdge(from, to);
        normalize();
      } else if (input.startsWith("/status")) {
        const args = input.split(" ");
        let idPrefix = args[1];
        let status = args[2];
        setStatus(idPrefix, status);
      } else {
        addNode(input);
        normalize();
      }
      setError(null);
      setInput("");
    } catch (e: unknown) {
      console.error(e);
      setError(e as Error);
    }
  };

  function normalize() {
    trySetState(
      produce((draft: Draft<ToposorterState>) => {
        const state = original(draft)!;
        draft.nodes = {};
        for (let id of toposort(state)) {
          draft.nodes[id] = state.nodes[id];
        }
      })
    );
  }

  function setStatus(idPrefix: string, status: string) {
    trySetState(
      produce((draft: Draft<ToposorterState>) => {
        let nodes = original(draft.nodes)!;
        let id = Object.keys(nodes).find((id) => id.startsWith(idPrefix));
        if (!id) {
          throw new Error(`Could not find node with prefix ${idPrefix}`);
        }
        if (status !== "active" && status !== "done") {
          throw new Error(
            `Invalid status ${status}. Expected "active" or "done"`
          );
        }
        draft.nodes[id].status = status as "active" | "done";
      })
    );
  }

  function deleteNode(idPrefix: string) {
    trySetState(
      produce((draft: Draft<ToposorterState>) => {
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
          const newChildren = nodes[key].children.filter(
            (childId) => childId !== id
          );
          draft.nodes[key].children = newChildren;
        }
      })
    );
  }

  function addEdge(fromPrefix: string, toPrefix: string) {
    trySetState(
      produce((draft: Draft<ToposorterState>) => {
        // reconcile ids
        let nodes = original(draft.nodes)!;
        let from = Object.keys(nodes).find((id) => id.startsWith(fromPrefix));
        let to = Object.keys(nodes).find((id) => id.startsWith(toPrefix));
        console.log(from, to);
        if (!from) {
          throw new Error(
            `Could not find child node with prefix ${fromPrefix}`
          );
        }
        if (!to) {
          throw new Error(`Could not find parent node with prefix ${toPrefix}`);
        }
        draft.nodes[from].children.push(to);
      })
    );
  }

  function addNode(value: string) {
    trySetState(
      produce((draft: ToposorterState) => {
        const id = uuidv4();
        draft.nodes[id] = {
          value,
          children: [],
        };
      })
    );
  }

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.currentTarget) {
      setInput(e.currentTarget.value);
    }
  };

  return (
    <div className="flex flex-col items-start m-20 space-y-8 p-8 w-[50%] rounded-xl h-[80%] bg-black bg-opacity-90">
      <h1 className="text-4xl text-white">Toposorter</h1>
      <div className="bg-white bg-opacity-10 flex flex-col-reverse w-full items-end overflow-y-scroll">
        {error && <pre className="text-red-500">{error.message}</pre>}
        <pre className="flex-1">{JSON.stringify(state, null, 2)}</pre>
      </div>
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

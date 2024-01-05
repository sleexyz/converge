import { Draft, original, produce } from "immer";
import * as React from "react";
import { v4 as uuidv4 } from "uuid";
import { useLocalStorageState } from "./state";

export type Id = string;

export interface TNode {
  value: string;
  createdAt: Date;
  status?: "active" | "done";
  children: Id[];
}

function statusToPoints(status: "active" | "done" | undefined): number {
  switch (status) {
    case "done":
      return 2;
    case "active":
      return 1;
    default:
      return 0;
  }
}

export function withNormalization(
  fn: (state: ToposorterStateData) => ToposorterStateData = (state) => state
) {
  return (state: ToposorterStateData) => {
    return produce((draft: Draft<ToposorterStateData>) => {
      const state = original(draft)!;
      draft.nodes = {};
      const entries = Object.entries(state.nodes).sort(
        ([_keyA, a], [_keyB, b]) => {
          const statusDiff =
            statusToPoints(b.status) - statusToPoints(a.status);
          if (statusDiff !== 0) {
            return statusDiff;
          }
          // prefer later createdAt
          const timeDiff = b.createdAt.getTime() - a.createdAt.getTime();
          if (timeDiff !== 0) {
            return timeDiff;
          }
          return 0;
        }
      );
      for (let id of Toposort.sort(entries)) {
        (draft.nodes[id] as any) = {};
        Object.assign(draft.nodes[id], state.nodes[id]);
        if (state.nodes[id].createdAt == undefined) {
          draft.nodes[id].createdAt = new Date();
        }
      }
    })(fn(state));
  };
}

export class Toposort {
  visited = new Set<Id>();
  nodes: Record<Id, TNode> = {};

  private constructor(entries: [key: Id, value: TNode][]) {
    this.nodes = Object.fromEntries(entries);
  }

  // Returns topologically sorted nodes.
  static sort(entries: [key: Id, value: TNode][]): Id[] {
    return new Toposort(entries).sort();
  }

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

export interface ToposorterStateData {
  nodes: Record<Id, TNode>;
}

export const SetErrorContext = React.createContext<
  ((error: Error | null) => void) | null
>(null);

export type TNodeRow = {
  id: Id;
  data: TNode;
};

export class ToposorterState {
  constructor(readonly state: ToposorterStateData) {}

  getNode(id: Id): TNode {
    return this.state.nodes[id];
  }

  getNodes(): Record<Id, TNode> {
    return this.state.nodes;
  }

  getActiveNode(): TNodeRow | null {
    for (let id of Object.keys(this.state.nodes)) {
      if (this.state.nodes[id].status === "active") {
        return {id, data: this.state.nodes[id]};
      }
    }
    return null
  }

  reconcileId(idPrefix: string): TNodeRow {
    let retId = undefined;
    for (let id of Object.keys(this.state.nodes)) {
      if (id.startsWith(idPrefix)) {
        if (retId) {
          throw new Error(`Multiple ids match prefix ${idPrefix}`);
        }
        retId = id;
      }
    }
    if (!retId) {
      throw new Error(`Could not find node with prefix ${idPrefix}`);
    }
    return {id: retId, data: this.state.nodes[retId]};
  }

  static setStatus(id: Id, status: string) {
    return produce((draft: Draft<ToposorterStateData>) => {
      if (status === "unset") {
        delete draft.nodes[id].status;
        return;
      }
      if (status !== "active" && status !== "done") {
        throw new Error(
          `Invalid status ${status}. Expected "active" or "done" or "unset"`
        );
      }
      console.log(id);
      draft.nodes[id].status = status as "active" | "done";
    });
  }

  static setValue(id: Id, value: string) {
    return produce((draft: Draft<ToposorterStateData>) => {
      draft.nodes[id].value = value;
    });
  }

  static deleteNode(id: Id) {
    return produce((draft: Draft<ToposorterStateData>) => {
      const state = new ToposorterState(original(draft)!);
      let nodes = state.getNodes();

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
    });
  }

  static addEdge(from: Id, to: Id) {
    return produce((draft: Draft<ToposorterStateData>) => {
      draft.nodes[from].children.push(to);
    });
  }

  static addNode(value: string) {
    return produce((draft: ToposorterStateData) => {
      const id = uuidv4();
      draft.nodes[id] = {
        value,
        createdAt: new Date(),
        children: [],
      };
    });
  }
}

export class StateManager {
  constructor(
    readonly trySetState: (
      fn: (state: ToposorterStateData) => ToposorterStateData
    ) => void
  ) {}

  bindAction<Args extends any[]>(
    action: (
      ...args: Args
    ) => (state: ToposorterStateData) => ToposorterStateData
  ): (...args: Args) => void {
    return (...args: Args) => {
      this.trySetState(action(...args));
    };
  }
  addNode = this.bindAction(ToposorterState.addNode);
  deleteNode = this.bindAction(ToposorterState.deleteNode);
  addEdge = this.bindAction(ToposorterState.addEdge);
  setStatus = this.bindAction(ToposorterState.setStatus);
  setValue = this.bindAction(ToposorterState.setValue);
}

export const StateManagerContext = React.createContext<StateManager | null>(
  null
);

export function useToposorterState() {
  return React.useContext(ToposorterStateContext)!;
}

export function useError() {
  return React.useContext(ErrorContext)!;
}

export const ToposorterStateContext = React.createContext<ToposorterState | null>(
  null
);
const ErrorContext = React.createContext<Error | null>(null);

export function ToposorterStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState, stateRef] = useLocalStorageState<ToposorterStateData>(
    "toposorter",
    {
      nodes: {},
    },
    produce((_draft: Draft<ToposorterStateData>) => {})
  );

  const [error, setError] = React.useState<null | Error>(null);
  const trySetState = (
    fn: (value: ToposorterStateData) => ToposorterStateData
  ) => {
    setState(fn(stateRef.current));
  };

  const stateManager = React.useMemo(
    () => new StateManager(trySetState),
    [trySetState]
  );

  const toposorterState = React.useMemo(() => {
    return new ToposorterState(state);
  }, [state]);

  return (
    <StateManagerContext.Provider value={stateManager}>
      <SetErrorContext.Provider value={setError}>
        <ToposorterStateContext.Provider value={toposorterState}>
          <ErrorContext.Provider value={error}>
            {children}
          </ErrorContext.Provider>
        </ToposorterStateContext.Provider>
      </SetErrorContext.Provider>
    </StateManagerContext.Provider>
  );
}

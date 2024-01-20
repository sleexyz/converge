import { Draft, original, produce } from "immer";
import * as React from "react";
import { v4 as uuidv4 } from "uuid";
import { useLocalStorageState, useMakeStateAsync } from "./state";

export type Id = string;

export type TNodeType = "task" | "goal" | "project";

export type Status = "active" | "done" | undefined;

export interface TNode {
  value: string;
  createdAt: Date;
  status?: Status;
  type?: TNodeType;
  notes?: string;
  children: Id[];
}

export class Toposort {
  visited = new Set<Id>();
  nodes: Record<Id, TNode> = {};

  private constructor(entries: [key: Id, value: TNode][]) {
    this.nodes = Object.fromEntries(entries);
  }

  // Returns topologically sorted nodes.
  static sort(entries: [key: Id, value: TNode][]): [key: Id, value: TNode][] {
    return new Toposort(entries).sort();
  }

  // Visit all nodes.
  // Visit all of a node's children recursively before visiting a node.
  // Then insertion order should be topologically sorted.
  sort(): [key: Id, value: TNode][] {
    for (let key of Object.keys(this.nodes)) {
      this.visitChildren(key);
    }
    return [...this.visited].map((x) => [x, this.nodes[x]]);
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
        return { id, data: this.state.nodes[id] };
      }
    }
    return null;
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
    return { id: retId, data: this.state.nodes[retId] };
  }
}

export class ToposorterStateManager {
  constructor(
    readonly trySetState: (
      fn: (state: ToposorterStateData) => ToposorterStateData
    ) => Promise<void>,
    readonly stateRef: React.MutableRefObject<ToposorterStateData>
  ) {}

  state() {
    return new ToposorterState(this.stateRef.current);
  }

  bindAction<Args extends any[]>(
    action: (
      ...args: Args
    ) => (state: ToposorterStateData) => ToposorterStateData
  ): (...args: Args) => Promise<void> {
    return async (...args: Args) => {
      await this.trySetState(action(...args));
    };
  }

  async add(from?: Id, connectionType?: "parent" | "child") {
    const id = uuidv4();
    await this.bindAction((from?: Id, connectionType?: "parent" | "child") => {
      return produce((draft: ToposorterStateData) => {
        draft.nodes[id] = {
          value: "",
          createdAt: new Date(),
          children: [],
        };
        if (!connectionType || !from) {
          return;
        }
        if (connectionType === "child") {
          draft.nodes[from].children.push(id);
        } else if (connectionType === "parent") {
          draft.nodes[id].children.push(from);
        } else {
          throw new Error(`Invalid connectionType ${connectionType}`);
        }
      });
    })(from, connectionType);
    return id;
  }

  deleteNode = this.bindAction((id: Id) => {
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
  });

  deleteEdge = this.bindAction((edgeId: Id) => {
    return produce((draft: Draft<ToposorterStateData>) => {
      const [from, to] = edgeId.split("--");
      draft.nodes[from].children = draft.nodes[from].children.filter(
        (x) => x !== to
      );
    });
  });

  addEdge = this.bindAction((from: Id, to: Id) => {
    return produce((draft: Draft<ToposorterStateData>) => {
      draft.nodes[from].children.push(to);
    });
  });

  setStatus = this.bindAction((id: Id, status: string) => {
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
      draft.nodes[id].status = status as "active" | "done";
    });
  });

  setType = this.bindAction((id: Id, type: string) => {
    return produce((draft: Draft<ToposorterStateData>) => {
      if (type !== "task" && type !== "goal" && type !== "project") {
        throw new Error(
          `Invalid type ${type}.`
        );
      }
      draft.nodes[id].type = type;
    });
  });

  setValue = this.bindAction((id: Id, value: string) => {
    return produce((draft: Draft<ToposorterStateData>) => {
      if (draft.nodes[id].value === value) {
        throw new AbortError();
      }
      draft.nodes[id].value = value;
    });
  });

  setNotes = this.bindAction((id: Id, notes: string) => {
    return produce((draft: Draft<ToposorterStateData>) => {
      draft.nodes[id].notes = notes;
    });
  });
}

export const ToposorterStateManagerContext =
  React.createContext<ToposorterStateManager | null>(null);

export function useToposorterState() {
  return React.useContext(ToposorterStateContext)!;
}

export function useError() {
  return React.useContext(ErrorContext)!;
}

export const ToposorterStateContext =
  React.createContext<ToposorterState | null>(null);
const ErrorContext = React.createContext<Error | null>(null);

export function ToposorterStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [_state, _setState, stateRef] =
    useLocalStorageState<ToposorterStateData>(
      "toposorter",
      {
        nodes: {},
      },
      x => x,
    );
  const [state, setState] = useMakeStateAsync([_state, _setState]);

  const [error, setError] = React.useState<null | Error>(null);
  const trySetState = async (
    fn: (value: ToposorterStateData) => ToposorterStateData
  ) => {
    try {
      await setState(fn(stateRef.current));
    } catch (e: unknown) {
      if (e instanceof AbortError) {
        return;
      }
      throw e;
    }
  };

  const stateManager = React.useMemo(
    () => new ToposorterStateManager(trySetState, stateRef),
    [trySetState, stateRef]
  );

  const toposorterState = React.useMemo(() => {
    return new ToposorterState(state);
  }, [state]);

  return (
    <ToposorterStateManagerContext.Provider value={stateManager}>
      <SetErrorContext.Provider value={setError}>
        <ToposorterStateContext.Provider value={toposorterState}>
          <ErrorContext.Provider value={error}>
            {children}
          </ErrorContext.Provider>
        </ToposorterStateContext.Provider>
      </SetErrorContext.Provider>
    </ToposorterStateManagerContext.Provider>
  );
}

class AbortError extends Error {
  constructor() {
    super("Aborted");
  }
}

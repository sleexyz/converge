import { Draft, original, produce } from "immer";
import * as React from "react";
import { v4 as uuidv4 } from "uuid";

export type Id = string;

export interface TNode {
  value: string;
  createdAt: Date;
  status?: "active" | "done";
  children: Id[];
}

export function useLocalStorageState<T>(
  key: string,
  defaultValue: T,
  // run migrations here
  normalizeState: (value: T) => T = (value) => value
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = React.useState<T>(() => {
    const value = localStorage.getItem(key);
    if (value) {
      return normalizeState(parseJSON(value));
    }
    return defaultValue;
  });

  React.useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
}

function parseJSON<T>(json: string): T {
  try {
    return JSON.parse(json, (key, value) => {
      if (key === "createdAt") {
        return new Date(value);
      }
      return value;
    });
  } catch (e) {
    throw new Error(`Could not parse JSON: ${e}`);
  }
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
          const statusDiff = statusToPoints(b.status) - statusToPoints(a.status);
          if (statusDiff !== 0) {
            return statusDiff;
          }
          // prefer later createdAt
          const timeDiff = b.createdAt.getTime() - a.createdAt.getTime();
          if (timeDiff !== 0) {
            return timeDiff;
          }
          return Math.random() - 0.5;
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

export const StateManagerContext = React.createContext<{
  addNode: (value: string) => void;
  deleteNode: (idPrefix: string) => void;
  addEdge: (fromPrefix: string, toPrefix: string) => void;
  setStatus: (idPrefix: string, status: string) => void;
} | null>(null);

export class ToposorterState {
  constructor(readonly state: ToposorterStateData) {}

  getNodes(): Record<Id, TNode> {
    return this.state.nodes;
  }

  reconcileId(idPrefix: string): Id | undefined {
    let ret = undefined;
    for (let id of Object.keys(this.state.nodes)) {
      if (id.startsWith(idPrefix)) {
        if (ret) {
          throw new Error(`Multiple ids match prefix ${idPrefix}`);
        }
        ret = id;
      }
    }
    return ret;
  }

  static setStatus(idPrefix: string, status: string) {
    return produce((draft: Draft<ToposorterStateData>) => {
      let nodes = original(draft.nodes)!;
      let id = Object.keys(nodes).find((id) => id.startsWith(idPrefix));
      if (!id) {
        throw new Error(`Could not find node with prefix ${idPrefix}`);
      }
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
  }

  static deleteNode(idPrefix: string) {
    return produce((draft: Draft<ToposorterStateData>) => {
      const state = new ToposorterState(original(draft)!);
      let nodes = state.getNodes();
      let id = state.reconcileId(idPrefix);
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
    });
  }

  static addEdge(fromPrefix: string, toPrefix: string) {
    return produce((draft: Draft<ToposorterStateData>) => {
      const state = new ToposorterState(original(draft)!);
      let from = state.reconcileId(fromPrefix);
      let to = state.reconcileId(toPrefix);
      if (!from) {
        throw new Error(`Could not find child node with prefix ${fromPrefix}`);
      }
      if (!to) {
        throw new Error(`Could not find parent node with prefix ${toPrefix}`);
      }
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

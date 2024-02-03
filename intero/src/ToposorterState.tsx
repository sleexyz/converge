import { Draft, original, produce } from "immer";
import * as React from "react";
import { v4 as uuidv4 } from "uuid";
import { useLocalStorageState, useMakeStateAsync } from "./state";

export type Id = string;

export type TNodeType = "task" | "goal" | "project" | "problem";

export type Status = "active" | "done" | undefined;

export interface TNodeData {
  value: string;
  createdAt: Date;
  status?: Status;
  type?: TNodeType;
  priority?: number;
  notes?: string;
  pinned?: boolean;

  /**  @deprecated **/
  children: Id[];

  __maxVec?: number[];
  __parents?: Id[];
}

export class TNode {
  constructor(readonly id: Id, readonly data: TNodeData) {}
  children() {
    return this.data.children;
  }
  parents() {
    return this.data.__parents ?? [];
  }
  get pinned() {
    return this.data.pinned;
  }
  get createdAt() {
    return this.data.createdAt;
  }
  get notes() {
    return this.data.notes;
  }
  get priority() {
    return this.data.priority;
  }
  get value() {
    return this.data.value;
  }
  get status() {
    return this.data.status;
  }
  get type() {
    return this.data.type;
  }
  maxVec() {
    return this.data.__maxVec;
  }
}

export interface RelationContext {
  depends: {parent: Id, child: Id}[]
}

export interface ToposorterStateData {
  nodes: Record<Id, TNodeData>;
  relations?: RelationContext;
}


export interface NodeContext {
  nodes(): Record<Id, TNodeData>;
  getChildren(node: Id): Id[];
}

export class Toposorter {
  visited = new Set<Id>();
  readonly data: Record<Id, TNodeData>;

  private constructor(entries: [key: Id, value: TNodeData][]) {
    this.data = Object.fromEntries(entries);
  }

  // Returns topologically sorted nodes.
  static sort(entries: [key: Id, value: TNodeData][]): [key: Id, value: TNode][] {
    return new Toposorter(entries).sort();
  }

  // Visit all nodes.
  // Visit all of a node's children recursively before visiting a node.
  // Then insertion order should be topologically sorted.
  sort(): [key: Id, value: TNode][] {
    const nodes: Record<Id, TNode> = {};

    for (let key of Object.keys(this.data)) {
      this.visitChildren(key, nodes);
    }

    return [...this.visited].map((x) => [x, nodes[x]]);
  }

  // DFS
  private visitChildren(key: Id, nodes: Record<Id, TNode>) {
    const visted = this.visited.has(key);
    if (visted) {
      return;
    }

    const data = this.data[key];
    if (!data) {
      return;
    }

    const node = new TNode(key, {...data});
    let maxVec = makeScoreVector(node);
    for (let childId of node.children()) {
      this.visitChildren(childId, nodes);
      maxVec = chooseMaxVec(maxVec, nodes[childId].maxVec()!);
      nodes[childId].parents().push(key);
    }
    nodes[key] = new TNode(key, {...this.data[key], __maxVec: maxVec, __parents: [] });
    this.visited.add(key);
  }
}

function chooseMaxVec(vecA: number[], vecB: number[]): number[] {
  return compareVecs(vecA, vecB) > 0 ? vecB : vecA;
}

export function compareVecs(vecA: number[], vecB: number[]): number {
  for (let i = 0; i < vecA.length; i++) {
    if (vecA[i] < vecB[i]) {
      return 1;
    }
    if (vecA[i] > vecB[i]) {
      return -1;
    }
  }
  return 0;
}

/**
 * Higher score is better.
 */
function makeScoreVector(node: TNode): number[] {
  return [
    node.pinned === true ? 1 : 0,
    statusToPoints(node.status),
    priorityToPoints(node.priority),
    node.createdAt.getTime(),
  ];
}


export function statusToPoints(status: Status): number {
  switch (status) {
    case "done":
      return -1;
    case "active":
      return 1;
    default:
      return 0;
  }
}

export function getPriority(priority: number | undefined): number {
  return priority ?? 3;
}

export function priorityToPoints(priority: number | undefined): number {
  return -1 * getPriority(priority);
}

export const SetErrorContext = React.createContext<
  ((error: Error | null) => void) | null
>(null);

export type TNodeRow = {
  id: Id;
  data: TNode;
};

export class ToposorterState {
  nodes: Record<Id, TNode>;

  constructor(state: ToposorterStateData) {
    let entries = Toposorter.sort(Object.entries(state.nodes));
    entries = orderNodes(entries);
    this.nodes = Object.fromEntries(entries);
  }

  getNode(id: Id): TNode{
    return this.nodes[id];
  }

  getNodes(): Record<Id, TNode> {
    return this.nodes;
  }

  getActiveNode(): TNodeRow | null {
    for (let id of Object.keys(this.nodes)) {
      if (this.nodes[id].status === "active") {
        return { id, data: this.nodes[id] };
      }
    }
    return null;
  }

  getRelevantNodesForSelection(id: Id): Set<Id> {
    const selected = this.getNode(id);
    const relevant = new Set<Id>();
    if (!selected) {
      return relevant;
    }
    this.collectDescendants(id, relevant);
    relevant.delete(id);
    this.collectAncestors(id, relevant);
    return relevant
  }

  collectAncestors(id: Id, set: Set<Id>) {
    const node = this.getNode(id);
    if (!node) {
      return;
    }
    // Just in case, break cycles
    if (set.has(id)) {
      return;
    }
    set.add(id);
    for (const parent of node.parents()) {
      this.collectAncestors(parent, set);
    }
  }
  collectDescendants(id: Id, set: Set<Id>) {
    const node = this.getNode(id);
    if (!node) {
      return;
    }
    // Just in case, break cycles
    if (set.has(id)) {
      return;
    }
    set.add(id);
    for (const child of node.children()) {
      this.collectDescendants(child, set);
    }
  }

  reconcileId(idPrefix: string): TNodeRow {
    let retId = undefined;
    for (let id of Object.keys(this.nodes)) {
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
    return { id: retId, data: this.nodes[retId] };
  }
}

// Ranks nodes and rearranges children ordering
// TODO: move ordering earlier
function orderNodes(entries: [string, TNode][]): [string, TNode][] {
  // rank nodes
  let out = [...entries];
  // out = Toposorter.sort(entries);
  // let out = entries;
  out = out.sort(([_keyA, a], [_keyB, b]) => {
    return compareVecs(a.maxVec()!, b.maxVec()!);
  });

  // Re-order edges in place
  const nodeIndicies = new Map<string, number>();
  for (let [i, [id]] of out.entries()) {
    nodeIndicies.set(id, i);
  }

  const newOut: [string, TNode][] = [];

  for (let [i, node] of out) {
    const newNode = node;
    // TODO: move this logic to Toposorter

    // const newNode = { ...node };
    // newNode.children = [...node.children]
    //   .filter((child) => nodeIndicies.has(child))
    //   .sort((a, b) => {
    //     const aIndex = nodeIndicies.get(a)!;
    //     const bIndex = nodeIndicies.get(b)!;
    //     return aIndex - bIndex;
    //   });
    newOut.push([i, newNode]);
  }

  return newOut;
}

export function orderEdges(entries: [Id, TNode][]): [parent: Id, child: Id][] {
  const edges: [Id, Id][] = [];
  let nodeIndicies = new Map<string, number>();

  for (let i = 0; i < entries.length; i++) {
    const [id] = entries[i];
    nodeIndicies.set(id, i);
  }

  for (let [i, node] of entries) {
    // TODO: move this logic to Toposorter

    const orderedChildren = [...node.children()]
      .filter((child) => nodeIndicies.has(child))
      .sort((a, b) => {
        const aIndex = nodeIndicies.get(a)!;
        const bIndex = nodeIndicies.get(b)!;
        return aIndex - bIndex;
      });
    for (let child of orderedChildren) {
      edges.push([i, child]);
    }
  }

  return edges;
}


function withNormalization(fn: (state: ToposorterStateData) => ToposorterStateData): (state: ToposorterStateData) => ToposorterStateData {
  return (state: ToposorterStateData) => {
    const out = fn(state);
    // const entries = Object.entries(state.nodes);
    // const sortedEntries = Toposorter.sort(entries);
    // const out = {
    //   ...input,
    //   nodes: Object.fromEntries(sortedEntries)
    // };
    return out;
  };
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
        const newChildren = nodes[key].children().filter(
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

  setPinned = this.bindAction((id: Id, value: boolean) => {
    return produce((draft: Draft<ToposorterStateData>) => {
      draft.nodes[id].pinned = value;
    });
  });

  setType = this.bindAction((id: Id, type: string) => {
    return produce((draft: Draft<ToposorterStateData>) => {
      if (type !== "task" && type !== "goal" && type !== "project" && type !== 'problem') {
        throw new Error(`Invalid type ${type}.`);
      }
      draft.nodes[id].type = type;
    });
  });

  setPriority = this.bindAction((id: Id, priority: number) => {
    return produce((draft: Draft<ToposorterStateData>) => {
      if (draft.nodes[id].priority === priority) {
        throw new AbortError();
      }
      draft.nodes[id].priority = priority;
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
  const [__state, _setState, stateRef] =
    useLocalStorageState<ToposorterStateData>(
      "toposorter",
      {
        nodes: {},
      },
      withNormalization((x) => x)
    );
  const [state, setState] = useMakeStateAsync([__state, _setState]);

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

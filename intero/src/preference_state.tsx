import { useMemo } from "react";
import { useLocalStorageState, useMakeStateAsync } from "./state";
import { produce } from "immer";
import * as React from "react";
import { Id, TNode, getPriority, priorityToPoints } from "./ToposorterState";

export interface HideObj {
  done?: boolean;
  task?: boolean;
  goal?: boolean;
  // minimum priority to hide
  // e.g. 3 means hide everything with priority 3 or higher
  minPriority?: number;
}

export interface Preferences {
  hide: HideObj;
}
export const PreferencesContext = React.createContext<Preferences>({
  hide: {},
});

export const PreferencesManagerContext =
  React.createContext<PreferencesManager | null>(null);

export class PreferencesManager {
  constructor(
    readonly setPreferences: (
      action: React.SetStateAction<Preferences>
    ) => Promise<void>
  ) {}

  async setFilter<K extends keyof HideObj>(key: K, value: HideObj[K] | undefined) {
    await this.setPreferences(
      produce((draft) => {
        draft.hide[key] = value;
      })
    );
  }
}

export function applyPreferencesFilter(
  preferences: Preferences,
  entries: [Id, TNode][]
): [Id, TNode][] {

  // return entries.filter(([, node]) => {
  //   return shouldShowNode(preferences, node);
  // });
  console.log(preferences);
  // memoize.
  let hidden = new Set();

  const filteredNodes: [Id, TNode][] = [];
  for (const [id, node] of entries) {
    if (!shouldShowNode(preferences, node)) {
      addHidden(id);
    } else if (node.parents().length > 0){
      // Hide if all parent are hidden
      let allParentsHidden = true;
      for (const parentId of node.parents()) {
        if (!hidden.has(parentId)) {
          allParentsHidden = false;
          break;
        }
      }
      if (allParentsHidden) {
        addHidden(id);
      }
    }

    if (!hidden.has(id)) {
      filteredNodes.push([id, node]);
    } 
  }
  function addHidden(id: Id) {
    if (id === "6715a1d3-adbe-4c2e-8b72-e08d030b0f89") {
      console.log("adding hidden for", id);
    }
    hidden.add(id);
  }
  return filteredNodes;
}

function shouldShowNode(preferences: Preferences, node: TNode): boolean {
    // NOTE: only return false in these conditionals
    // to allow cascading.
    if (preferences.hide.minPriority && getPriority(node.priority) >= preferences.hide.minPriority) {
      return false;
    }
    if (preferences.hide.done && node.status === "done") {
      return false;
    }
    if (preferences.hide.task && (node.type === "task" || node.type == null)) {
      return false;
    }
    if (preferences.hide.goal && node.type === "goal") {
      return false;
    }
    return true;
}

export function PreferencesProvider({
  children,
}: {
  children?: React.ReactNode;
}) {
  const [_preferences, _setPreferences] = useLocalStorageState<Preferences>(
    "preferences",
    {
      hide: {},
    }
  );
  const [preferences, setPreferences] = useMakeStateAsync([
    _preferences,
    _setPreferences,
  ]);

  const preferencesManager = useMemo(
    () => new PreferencesManager(setPreferences),
    [setPreferences]
  );

  return (
    <PreferencesContext.Provider value={preferences}>
      <PreferencesManagerContext.Provider value={preferencesManager}>
        {children}
      </PreferencesManagerContext.Provider>
    </PreferencesContext.Provider>
  );
}

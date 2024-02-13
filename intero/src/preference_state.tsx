import { useMemo } from "react";
import { useLocalStorageState, useMakeStateAsync } from "./state";
import { produce } from "immer";
import * as React from "react";
import { Id, TNode, getPriority, priorityToPoints } from "./ToposorterState";

export interface HideObj extends HideBools {
  // minimum priority to hide
  // e.g. 3 means hide everything with priority 3 or higher
  minPriority?: number;
}

export interface HideBools {
  done?: boolean;
  task?: boolean;
  goal?: boolean;
}

export interface Preferences {
  focus?: Id;
  hide: HideObj;
  showScreenWatcherDebug?: boolean;
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

  async setFilter<K extends keyof HideObj>(
    key: K,
    value: HideObj[K] | undefined
  ) {
    await this.setPreferences(
      produce((draft) => {
        draft.hide[key] = value;
      })
    );
  }
  async focus(subject: Id) {
    await this.setPreferences(
      produce((draft) => {
        draft.focus = subject;
      })
    );
  }
  async unfocus() {
    await this.setPreferences(
      produce((draft) => {
        draft.focus = undefined;
      })
    );
  }
  async setShowScreenWatcherDebug(value: boolean) {
    await this.setPreferences(
      produce((draft) => {
        draft.showScreenWatcherDebug = value;
      })
    );
  }
}

export function applyPreferencesFilter(
  preferences: Preferences,
  entries: [Id, TNode][]
): [Id, TNode][] {
  return entries.filter(([, node]) => {
    return shouldShowNode(preferences, node);
  });
}

// NOTE: only return false in these conditionals
// to allow cascading.
function shouldShowNode(preferences: Preferences, node: TNode): boolean {
  if (preferences.focus) {
    if (node.id !== preferences.focus && !node.ancestors().has(preferences.focus)) {
      return false;
    }
  }

  if (
    preferences.hide.minPriority &&
    getPriority(node.priority) >= preferences.hide.minPriority
  ) {
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

import { useMemo } from "react";
import { useLocalStorageState, useMakeStateAsync } from "./state";
import { produce } from "immer";
import * as React from "react";
import { Id, TNode } from "./ToposorterState";

export interface HideObj {
  done?: boolean;
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
    readonly setPreferences: (action: React.SetStateAction<Preferences>) => Promise<void>
  ) {}

  async setFilter(key: keyof HideObj, value: boolean) {
    await this.setPreferences(produce(draft => {
        draft.hide[key] = value;
    }));
  }
}

export function applyPreferencesFilter(preferences: Preferences, entries: [Id, TNode][]): [Id, TNode][] {
  return entries.filter(([, node]) => {
    if (preferences.hide.done && node.status === 'done') {
      return false;
    }
    return true;
  })
}

export function PreferencesProvider({ children }: { children?: React.ReactNode }) {
  const [_preferences, _setPreferences] = useLocalStorageState<Preferences>(
    "preferences",
    {
      hide: {},
    }
  );
  const [preferences, setPreferences] = useMakeStateAsync([_preferences, _setPreferences]);

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

import {
  Dispatch,
  SetStateAction,
  createContext,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { Id, useToposorterState } from "./ToposorterState";
import { useLocalStorageState } from "./state";
import { Draft, original, produce } from "immer";

// Writes through to activity state.
export function useSyncActivityState() {
  const state = useToposorterState();
  const activeNode = useMemo(() => state.getActiveNode(), [state]);

  const activityLog = useContext(ActivityLogContext)!;

  useEffect(() => {
    if (activeNode) {
      activityLog.start(activeNode.id);
    } else {
      activityLog.stop();
    }
  }, [activeNode, activityLog]);
}

interface LogRow {
  activityId: Id;
  createdAt: Date;
  type: "start" | "stop";
}

interface ActivityLogData {
  rows: LogRow[];
}

class ActivityLog {
  constructor(
    readonly state: ActivityLogData,
    readonly setState: Dispatch<SetStateAction<ActivityLogData>>
  ) {}

  private getLastRow(): LogRow | null {
    return this.state.rows[this.state.rows.length - 1] ?? null;
  }

  // idempotent
  stop() {
    const activeActivity = this.getActiveActivity();
    if (activeActivity) {
      this.stopActivity(activeActivity.activityId);
    }
  }

  // idempotent
  start(activityId: Id) {
    const activeActivity = this.getActiveActivity();
    if (activeActivity) {
      if (activeActivity.activityId === activityId) {
        // redundant start
        return;
      }
      this.stop();
    }
    this.startActivity(activityId);
  }

  private stopActivity(activityId: Id) {
    this.setState(
      produce((draft) => {
        draft.rows.push({
          activityId,
          createdAt: new Date(),
          type: "stop",
        });
      })
    );
  }

  private startActivity(activityId: Id) {
    this.setState(
      produce((draft) => {
        draft.rows.push({
          activityId,
          createdAt: new Date(),
          type: "start",
        });
      })
    );
  }

  getActiveActivity(): LogRow | null {
    if (this.state.rows.length === 0) {
      return null;
    }
    const lastRow = this.getLastRow()!;
    if (lastRow.type === "start") {
      return lastRow;
    }
    return null;
  }
}

export const ActivityLogContext = createContext<ActivityLog | null>(null);

export function ActivityLogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useLocalStorageState<ActivityLogData>(
    "activityLog",
    {
      rows: [],
    },
    produce((draft: Draft<ActivityLogData>) => {
      const state = original(draft)!;
      if (state.rows === undefined) {
        draft.rows = [];
      }
      delete (draft as any).nodes;
    })
  );
  const activityLog = useMemo(
    () => new ActivityLog(state, setState),
    [state, setState]
  );
  return (
    <ActivityLogContext.Provider value={activityLog}>
      {children}
    </ActivityLogContext.Provider>
  );
}

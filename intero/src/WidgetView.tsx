import { useContext, useEffect, useState } from "react";
import "./WidgetView.css";
// import { XEyes } from "./XEyes";
import { listen } from "@tauri-apps/api/event";
import { intervalToDuration, formatDuration } from "date-fns";
import { ActivityLogContext, ActivityLogProvider } from "./activity";
import { ToposorterStateContext, ToposorterStateProvider } from "./ToposorterState";

interface MouseMoved {
  x: number;
  y: number;
  window_x: number;
  window_y: number;
  window_width: number;
  window_height: number;
}

function WidgetViewInner() {
  const activityLog = useContext(ActivityLogContext)!;

  const inWindow = useInWindow();

  const [_interval, setInterval] = useState<number | null>(null);
  const [_tick, setTick] = useState(0);

  // TODO: clear interval after timer ends.
  useEffect(() => {
    setInterval(
      window.setInterval(() => {
        setTick((tick) => tick + 1);
      }, 1000)
    );

    return () => {
      setInterval((interval: number | null) => {
        if (interval) {
          window.clearInterval(interval);
        }
        return null;
      });
    };
  }, []);

  const toposorterState = useContext(ToposorterStateContext)!;
  const lastRow = activityLog.getActiveActivity();
  const id = lastRow?.activityId;
  const activity = id ? toposorterState.getNode(id) : null;
  if (!id || !activity) {
    return <></>;
  }

  // const timeSpentMillis = start ? ((Date.now() - start.getTime())) : 0;
  const duration = intervalToDuration({
    start: lastRow.createdAt,
    end: new Date(),
  });
  const timeSpentString = formatDuration(duration, {
    format: ["hours", "minutes"],
  });

  let classes = "transition-opacity duration-150 ease-in-out";
  if (inWindow) {
    classes += " opacity-10";
  } else {
    classes += " opacity-100";
  }

  return (
    // <XEyes />
    <div
      className={["h-screen flex flex-col items-end justify-end", classes].join(
        " "
      )}
    >
      <div className="rounded-xl bg-black p-2 flex flex-col justify-center items-center">
        <div className="rounded-xl bg-black p-2 text-2xl">{activity.value}</div>
        <div className="rounded-xl bg-black p-2">{timeSpentString}</div>
      </div>
    </div>
  );
}


function useInWindow() {
  const [inWindow, setInWindow] = useState(false);
  useEffect(() => {
    const unlistenPromise = listen("mouse-moved", (event) => {
      const mouseMoved = event.payload as MouseMoved;
      const x = mouseMoved.x - mouseMoved.window_x;
      const y = mouseMoved.window_height - (mouseMoved.y - mouseMoved.window_y);
      const cursorInWindow =
        x >= 0 &&
        x <= mouseMoved.window_width &&
        y >= 0 &&
        y <= mouseMoved.window_height;
      if (cursorInWindow) {
        setInWindow(true);
      } else {
        setInWindow(false);
      }
    });
    return () => {
      unlistenPromise.then((unlisten) => {
        unlisten();
      });
    };
  }, []);

  return inWindow;
}

export function WidgetView() {
  return (
    <ActivityLogProvider>
      <ToposorterStateProvider>
        <WidgetViewInner />
      </ToposorterStateProvider>
    </ActivityLogProvider>
  );
}

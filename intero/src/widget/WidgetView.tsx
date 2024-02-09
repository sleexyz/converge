import { useContext, useEffect, useRef, useState } from "react";
import "./WidgetView.css";
// import { XEyes } from "./XEyes";
import { listen } from "@tauri-apps/api/event";
import { intervalToDuration, formatDuration } from "date-fns";
import { ActivityLogContext, ActivityLogProvider } from "../activity";
import {
  ToposorterStateContext,
  ToposorterStateProvider,
} from "../ToposorterState";
import { GlassWindow } from "./GlassWindow";

interface MouseMoved {
  x: number;
  y: number;
  window_x: number;
  window_y: number;
  window_width: number;
  window_height: number;
}

function useActiveActivity() {
  const activityLog = useContext(ActivityLogContext)!;
  const toposorterState = useContext(ToposorterStateContext)!;
  const lastRow = activityLog.getActiveActivity();
  const id = lastRow?.activityId;
  const activity = id ? toposorterState.getNode(id) : null;
  return { row: lastRow, activity };
}

function WidgetViewInner() {
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

  const { row, activity } = useActiveActivity();

  let innerElement = <></>;
  const backgroundStyle: React.CSSProperties = {};

  const ref = useRef<any>();

  const coords = useMousePosition();

  if (activity && row) {
    // const timeSpentMillis = start ? ((Date.now() - start.getTime())) : 0;
    const duration = intervalToDuration({
      start: row.createdAt,
      end: new Date(),
    });
    const timeSpentString = formatDuration(duration, {
      format: ["hours", "minutes"],
    });

    let classes = "transition-opacity duration-150 ease-in-out";

    const rect = ref.current?.getBoundingClientRect();

    let inWindow = false;
    if (rect) {
      if (coords.x >= rect.x  && coords.x <= rect.x + rect.width && coords.y >= rect.y && coords.y <= rect.y + rect.height) {
        inWindow = true;
      }
    }

    if (inWindow) {
      classes += " opacity-10";
    } else {
      classes += " opacity-100";
    }

    innerElement = (
      <GlassWindow
        className={[
          "absolute bottom-0 right-0 flex flex-col items-end justify-end",
          classes,
        ].join(" ")}
        ref={ref}
      >
        <div className="rounded-xl p-2 text-2xl">{activity.value}</div>
        <div className="rounded-xl p-2">{timeSpentString}</div>
      </GlassWindow>
    );
    backgroundStyle.backgroundColor = "transparent";
  } else {
    backgroundStyle.backgroundColor = "rgba(0, 0, 0, 0.5)";
  }

  return (
    // <XEyes />
    <div className="w-[100vw] h-[100vh]" style={backgroundStyle}>
      {innerElement}
    </div>
  );
}

function useMousePosition() {
  const [coords, setCoords] = useState({x: 0, y: 0});
  useEffect(() => {
    const unlistenPromise = listen("mouse-moved", (event) => {
      const mouseMoved = event.payload as MouseMoved;
      const x = mouseMoved.x - mouseMoved.window_x;
      const y = mouseMoved.window_height - (mouseMoved.y - mouseMoved.window_y);
      setCoords({x, y});
    });
    return () => {
      unlistenPromise.then((unlisten) => {
        unlisten();
      });
    };
  }, []);
  return coords;
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

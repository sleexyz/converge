import { useContext, useEffect, useRef, useState } from "react";
import "./WidgetView.css";
// import { XEyes } from "./XEyes";
import { intervalToDuration, formatDuration } from "date-fns";
import { ActivityLogContext, ActivityLogProvider } from "../activity";
import {
  ToposorterStateContext,
  ToposorterStateProvider,
} from "../ToposorterState";
import { ScreenWatcher } from "../screen_watcher";
import { useInWindow } from "./mouse_hacks";

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
  const [nature, setNature] = useState<
    { description: string, activity: string; reason: string } | undefined
  >(undefined);
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    // minimum frame interval (ms)
    const minFrameInterval = 20 * 1000;
    async function loop() {
      const timeNow = new Date().getTime();
      try {
        const { nature, image } =
          await ScreenWatcher.instance.start();
        setNature(nature);
        setImage(image);
      } catch (e) {
        console.error(e);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      const timeElapsed = new Date().getTime() - timeNow;
      await new Promise(resolve => setTimeout(resolve, Math.max(minFrameInterval - timeElapsed, 0)));
      if (!cancel) {
        loop();
      }
    }
    loop();
    return () => {
      cancel = true;
    };
  }, []);

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
  let message = <></>;
  const backgroundStyle: React.CSSProperties = {
    backgroundColor: "rgba(0, 0, 0, 0.0)",
  };

  const ref = useRef<any>();

  const inWindow = useInWindow(ref.current);

  if (activity && row) {
    const duration = intervalToDuration({
      start: row.createdAt,
      end: new Date(),
    });
    const timeSpentString = formatDuration(duration, {
      format: ["hours", "minutes"],
    });

    let classes = "transition-opacity duration-150 ease-in-out";

    if (nature?.activity === "distraction") {
      backgroundStyle.backgroundColor = "rgba(0, 0, 0, 0.7)";
      message = (
        <div className="flex items-center justify-center w-full h-full text-4xl text-white">
          Hey! Focus!
        </div>
      );
    }

    if (inWindow) {
      classes += " opacity-10";
    } else {
      classes += " opacity-100";
    }

    innerElement = (
      <div
        className={[
          "absolute bottom-0 right-0 flex flex-col items-end justify-end max-w-96 bg-black bg-opacity-80 p-2 rounded-xl m-2 text-white text-xs font-mono",
          classes,
        ].join(" ")}
        ref={ref}
      >
        <div className="rounded-xl text-xs font-mono">{activity.value}</div>
        <div className="rounded-xl text-xs mb-10 font-mono">
          {timeSpentString}
        </div>
        <pre className="text-xs whitespace-pre-wrap mt-2">
          {JSON.stringify(nature, null, 2)}
        </pre>
        {image && (
          <img
            src={`data:image/png;base64,${image}`}
            alt="screenshot"
            className="rounded-xl mt-2"
          />
        )}
      </div>
    );
  } else {
    message = (
      <div className="flex items-center justify-center w-full h-full text-4xl">
        What's next?
      </div>
    );
    backgroundStyle.backgroundColor = "rgba(255, 255, 255, 0.5)";
  }

  return (
    // <XEyes />
    <div
      className="w-[100vw] h-[100vh] transition-colors duration-[2000ms] ease-in-out"
      style={backgroundStyle}
    >
      {message}
      {innerElement}
    </div>
  );
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

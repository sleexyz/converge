import { useContext, useEffect, useMemo, useRef, useState } from "react";
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
import * as pixelmatch from "pixelmatch";

function useActiveActivity() {
  const activityLog = useContext(ActivityLogContext)!;
  const toposorterState = useContext(ToposorterStateContext)!;
  const lastRow = activityLog.getActiveActivity();
  const id = lastRow?.activityId;
  const activity = id ? toposorterState.getNode(id) : null;
  return { row: lastRow, activity };
}

function useLoop({
  interval,
  callback,
}: {
  interval: number;
  callback: () => void;
}) {
  useEffect(() => {
    let cancel = false;
    let lastTimeout: number | null = null;
    async function loop() {
      if (cancel) {
        return;
      }
      const timeStart = new Date().getTime();
      try {
        await callback();
      } catch (e) {
        console.error(e);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      const timeElapsed = new Date().getTime() - timeStart;
      if (!cancel) {
        const waitTime = Math.max(interval - timeElapsed, 0);
        lastTimeout = window.setTimeout(loop, waitTime);
      }
    }
    loop();
    return () => {
      cancel = true;
      if (lastTimeout) {
        window.clearTimeout(lastTimeout);
      }
    };
  }, []);
}

async function getImageInfo(
  image: string
): Promise<{ imageData: Uint8ClampedArray; width: number; height: number }> {
  const img = await getImage(image);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;

  // Get the context of the canvas
  const ctx = canvas.getContext("2d")!;

  // Draw the image onto the canvas
  ctx.drawImage(img, 0, 0);

  // Extract the pixel data from the canvas
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return {
    imageData: imageData.data,
    width: canvas.width,
    height: canvas.height,
  };
}

async function getImage(image: string): Promise<HTMLImageElement> {
  const img = document.createElement("img");
  img.src = `data:image/png;base64,${image}`;
  await new Promise((resolve) => {
    img.onload = resolve;
  });
  return img;
}

const MIN_NUM_DIFF_PIXELS = 10000;

function WidgetViewInner() {
  const [_interval, setInterval] = useState<number | null>(null);
  const [_tick, setTick] = useState(0);
  const [response, setResponse] = useState<
    { description: string; activity: string; reason: string } | undefined
  >(undefined);

  const natureRef = useRef<string | null>(null);
  useEffect(() => {
    if (response?.activity) {
      natureRef.current = response.activity;
    }
  }, [response]);

  const currentImageRef = useRef<string | null>(null);

  const imageRef = useRef<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [numDiffPixels, setNumDiffPixels] = useState<number | null>(null);

  useLoop({
    interval: 1000 / 2,
    callback: async () => {
      const image = await ScreenWatcher.instance.screenshot();

      // need to compare the image to the old image to prevent unnecessary re-renders
      if (currentImageRef.current != null) {
        // convert to Uint8Array
        const [oldImageInfo, newImageInfo] = await Promise.all([
          getImageInfo(currentImageRef.current!),
          getImageInfo(image!),
        ]);

        const numDiffPixels = pixelmatch(
          oldImageInfo.imageData,
          newImageInfo.imageData,
          null,
          oldImageInfo.width,
          oldImageInfo.height,
          { threshold: 0.1 }
        );
        setNumDiffPixels(numDiffPixels);

        if (numDiffPixels > MIN_NUM_DIFF_PIXELS) {
          setImage(image);
          imageRef.current = image;
        }
      } else {
        setImage(image);
        imageRef.current = image;
      }
      currentImageRef.current = image;
    },
  });

  const analyzedImageRef = useRef<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const [lock, setLock] = useState(false);
  useEffect(() => {
    (async () => {
      if (image && image !== analyzedImageRef.current) {
        if (lock) {
          abortControllerRef.current?.abort();
          abortControllerRef.current = null;
          return;
        }
        setLock(true);
        analyzedImageRef.current = image;
        setResponse(undefined);
        try {
          abortControllerRef.current = new AbortController();
          const response =
            await ScreenWatcher.instance.getScreenshotDescriptionOpenAI(image, abortControllerRef.current);
          // check if stale
          if (imageRef.current === image) {
            setResponse(response);
          }
        } catch(e) {
          console.error(e);
        } finally {
          setLock(false);
        }
      }
    })();
  }, [image, lock]);

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

    let classes = "transition-all duration-500 ease-in-out";

    const style: React.CSSProperties = {
      backgroundColor: "rgba(0, 0, 0, 0.9)",
    };

    // if (natureRef.current === "distraction") {
    if (response?.activity === "distraction") {
      backgroundStyle.backgroundColor = "rgba(0, 0, 0, 0.7)";
      message = (
        <div
          className="flex items-center justify-center w-full h-full text-white"
          style={{ fontSize: "10rem" }}
        >
          Hey! Focus!
        </div>
      );
    }

    const numDiffPixelsStyle: React.CSSProperties = {};
    if (numDiffPixels !== null && numDiffPixels > MIN_NUM_DIFF_PIXELS) {
      numDiffPixelsStyle.backgroundColor = "rgba(255, 255, 255, 0.5)";
    }

    if (inWindow) {
      classes += " opacity-10";
    } else {
      classes += " opacity-100";
    }

    innerElement = (
      <div
        className={[
          "absolute bottom-0 right-0 flex flex-col items-end justify-end w-96 max-w-96 bg-black bg-opacity-80 p-4 rounded-xl m-2 text-white text-sm font-mono h-[90vh]",
          classes,
        ].join(" ")}
        ref={ref}
        style={style}
      >
        {/* <div className="rounded-xl text-xs font-mono">{activity.value}</div>
        <div className="rounded-xl text-xs mb-10 font-mono">
          {timeSpentString}
        </div> */}
        <div className="flex-1">
          <pre className="text-sm whitespace-pre-wrap mt-2 w-full">
            numDiffPixels:{" "}
            <span
              className="transition-all duration-500 ease-in-out"
              style={numDiffPixelsStyle}
            >
              {numDiffPixels}
            </span>
          </pre>
          {image && (
            <>
              <div>last relevant frame:</div>
              <img
                src={`data:image/png;base64,${image}`}
                alt="screenshot"
                className="rounded-xl mt-2"
              />
            </>
          )}
        </div>
        {analyzedImageRef.current && response && (
          <div className="flex flex-col flex-1 space-y-8">
            <pre className="text-xl whitespace-pre-wrap mt-2 w-full flex-1">
              Verdict: <b>{response.activity}</b>
            </pre>
            <pre className="text-sm whitespace-pre-wrap mt-2 w-full flex-1">
              {response.description}
            </pre>
            <pre className="text-sm whitespace-pre-wrap mt-2 w-full flex-1">
              Reason: {response.reason}
            </pre>
            <img
              src={`data:image/png;base64,${analyzedImageRef.current}`}
              alt="screenshot"
              className="rounded-xl mt-2"
            />
          </div>
        )}
        {(!analyzedImageRef.current || !response) && image && (
          <div className="flex-1 flex justify-center items-center w-full">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
          </div>
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

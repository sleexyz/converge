import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./WidgetView.css";
import {
  ActivityLogContext,
  ActivityLogProvider,
  LogRow,
  useSyncActivityState,
} from "../activity";
import {
  TNode,
  ToposorterStateContext,
  ToposorterStateManagerContext,
  ToposorterStateProvider,
} from "../ToposorterState";
import { ScreenWatcher } from "../screen_watcher";
import { useInWindow } from "./mouse_hacks";
import * as pixelmatch from "pixelmatch";
import { produce } from "immer";
import { PreferencesContext, PreferencesProvider } from "../preference_state";


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

function ActualWidgetViewOuter() {
  const { row, activity } = useActiveActivity();
  useSyncActivityState();
  return (
    <>{row && activity && <ActualWidgetView row={row} activity={activity} />}</>
  );
}

function ActualWidgetView({ activity, row }: { activity: TNode; row: LogRow }) {
  const [_interval, setInterval] = useState<number | null>(null);
  const [, setTick] = useState(0);

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

  // const timeSpentString = formatDuration(row.endTime!.getTime() - row.createdAt.getTime());

  const ancestorsElem = [...activity.ancestors()].map((x, i) => (
    <div key={x.id}>
      <span>
        {" ".repeat(i)}
        {i > 0 && "└ "}
      </span>
      <span>{x.value}</span>
    </div>
  ));

  const toposorterStateManager = useContext(ToposorterStateManagerContext)!;

  // throw Timer logic here
  useEffect(() => {
    if (!row.endTime) {
      return;
    }

    async function cb() {
      // stop the activiton
      await toposorterStateManager.setStatus(row.activityId, "unset");
    }

    const timeLeft = row.endTime.getTime() - Date.now();
    const timeout = window.setTimeout(cb, timeLeft);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [row, activity]);

  // const timeSpentString = formatDuration(new Date().getTime() - row.createdAt.getTime());
  const timeLeftString = formatDuration(row.endTime!.getTime() - new Date().getTime());

  // const timerDuration = formatDuration(row.endTime!.getTime() -  row.createdAt.getTime());

  return (
    <HideOnHoverDiv className="absolute bottom-[50vh] right-0 flex flex-col items-end justify-end bg-black bg-opacity-80 p-4 rounded-xl m-2 text-white text-sm font-mono space-y-2 max-w-72">
      <div className="whitespace-pre-wrap text-gray-200 text-left w-full flex flex-col">
        {ancestorsElem && (
          <>
            {ancestorsElem}
            <br />
          </>
        )}
      </div>
      <div className="rounded-xl text-xl font-mono w-full">
        {activity.value}
      </div>
      {activity.notes && (
        <div className="rounded-xl text-sm font-mono w-full whitespace-pre-wrap">
          {activity.notes}
        </div>
      )}
      {/* {timerDuration} */}
      {/* <div className="rounded-xl text-sm font-mono">Elapsed: {timeSpentString}</div> */}
      <div className="rounded-xl text-sm font-mono">{timeLeftString}</div>
    </HideOnHoverDiv>
  );
}

type Key = "distracted" | "aimless";

function orderedEntries<T>(obj: Record<Key, T>): [Key, T][] {
  return (["distracted", "aimless"] as Key[]).map((key) => [key, obj[key]]);
}

function getFirstDefined<T>(obj: Record<Key, T>, defaultValue: T): T {
  for (const [_, value] of orderedEntries(obj)) {
    if (value !== undefined) {
      return value;
    }
  }
  return defaultValue;
}
function WidgetViewOuter(props: { children: React.ReactNode }) {
  const [backgroundStyle, setBackgroundStyle] = useState<
    Record<string, React.CSSProperties>
  >({});

  const [message, setMessage] = useState<Record<string, JSX.Element>>({});

  const uiStateContext = useMemo(
    () => ({
      setBackgroundStyle,
      setMessage,
    }),
    [setBackgroundStyle, setMessage]
  );

  return (
    <div
      className="w-[100vw] h-[100vh] transition-colors duration-[2000ms] ease-in-out"
      style={getFirstDefined(backgroundStyle, {
        backgroundColor: "rgba(0, 0, 0, 0.0)",
      })}
    >
      <UIStateContext.Provider value={uiStateContext}>
        {getFirstDefined(message, <></>)}
        {props.children}
      </UIStateContext.Provider>
    </div>
  );
}

const UIStateContext = createContext<{
  setBackgroundStyle: React.Dispatch<
    React.SetStateAction<Record<string, React.CSSProperties>>
  >;
  setMessage: React.Dispatch<React.SetStateAction<Record<string, JSX.Element>>>;
} | null>(null);

function HideOnHoverDiv(props: React.HTMLProps<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const inWindow = useInWindow(ref.current);
  return (
    <div
      ref={ref}
      {...props}
      className={[
        "transition-opacity duration-500 ease-in-out",
        inWindow ? "opacity-0" : "opacity-100",
        props.className,
      ].join(" ")}
    />
  );
}

function ScreenWatcherViewOuter() {
  const preferences = useContext(PreferencesContext)!;
  if (!preferences.boolOptions.watch) {
    return <></>;
  }
  return <ScreenWatcherView />;
}

function ScreenWatcherView() {
  const { setBackgroundStyle, setMessage } = useContext(UIStateContext)!;
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
            await ScreenWatcher.instance.getScreenshotDescriptionLocal(
              image,
              abortControllerRef.current
            );
          // check if stale
          if (imageRef.current === image) {
            setResponse(response);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLock(false);
        }
      }
    })();
  }, [image, lock]);

  const style: React.CSSProperties = {
    backgroundColor: "rgba(0, 0, 0, 0.9)",
  };

  useEffect(() => {
    if (response?.activity === "distraction") {
      setBackgroundStyle(
        produce((draft) => {
          draft.distracted = { backgroundColor: "rgba(0, 0, 0, 0.7)" };
        })
      );

      setMessage(
        produce((draft) => {
          draft.distracted = (
            <div
              className="flex items-center justify-center w-full h-full text-white"
              style={{ fontSize: "10rem" }}
            >
              Hey! Focus!
            </div>
          );
        })
      );
    } else {
      setBackgroundStyle(
        produce((draft) => {
          delete draft.distracted;
        })
      );
      setMessage(
        produce((draft) => {
          delete draft.distracted;
        })
      );
    }
  }, [response?.activity]);

  const numDiffPixelsStyle: React.CSSProperties = {};
  if (numDiffPixels !== null && numDiffPixels > MIN_NUM_DIFF_PIXELS) {
    numDiffPixelsStyle.backgroundColor = "rgba(255, 255, 255, 0.5)";
  }

  const { activity, row } = useActiveActivity();
  useEffect(() => {
    if (!(activity && row)) {
      setBackgroundStyle(
        produce((draft) => {
          draft.aimless = { backgroundColor: "rgba(255, 255, 255, 0.7)" };
        })
      );

      setMessage(
        produce((draft) => {
          draft.aimless = (
            <div
              className="flex items-center justify-center w-full h-full text-black"
              style={{ fontSize: "10rem" }}
            >
              What's next?
            </div>
          );
        })
      );
    } else {
      setBackgroundStyle(
        produce((draft) => {
          delete draft.aimless;
        })
      );
      setMessage(
        produce((draft) => {
          delete draft.aimless;
        })
      );
    }
  }, [activity && row]);

  const preferences = useContext(PreferencesContext)!;
  if (!preferences.boolOptions.debug) {
    return <></>;
  }

  return (
    <HideOnHoverDiv
      className="absolute bottom-[10vh] left-0 flex flex-col items-end justify-end w-96 max-w-96 bg-black bg-opacity-80 p-4 rounded-xl m-2 text-white text-sm font-mono h-[80vh]"
      style={style}
    >
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
        <div className="flex flex-col flex-1 space-y-4 justify-between h-full">
          <pre className="text-sm whitespace-pre-wrap w-full flex-1">
            {response.description}
          </pre>
          <pre className="text-xl whitespace-pre-wrap w-full flex-1">
            Verdict: <b>{response.activity}</b>
          </pre>
          <pre className="text-sm whitespace-pre-wrap w-full flex-1">
            Reason: {response.reason}
          </pre>
          {/* <img
            src={`data:image/png;base64,${analyzedImageRef.current}`}
            alt="screenshot"
            className="rounded-xl mt-2"
          /> */}
        </div>
      )}
      {(!analyzedImageRef.current || !response) && image && (
        <div className="flex-1 flex justify-center items-center w-full">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      )}
    </HideOnHoverDiv>
  );
}

export function WidgetView() {
  return (
    <PreferencesProvider>
      <ToposorterStateProvider>
        <ActivityLogProvider>
          <WidgetViewOuter>
            <ScreenWatcherViewOuter />
            <ActualWidgetViewOuter />
          </WidgetViewOuter>
        </ActivityLogProvider>
      </ToposorterStateProvider>
    </PreferencesProvider>
  );
}


function formatDuration(durationInMillis: number): string {
  if (durationInMillis < 0) {
    return "-:--";
  }
  const minutes = Math.floor(durationInMillis / 60000);
  const seconds = Math.floor((durationInMillis % 60000) / 1000);

  const formattedDuration = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  return formattedDuration;
}
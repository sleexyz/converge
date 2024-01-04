import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { intervalToDuration, formatDuration } from "date-fns";
import {
  Activity,
  activityStateKey,
  getActiveActivity,
  loadState,
  saveState,
} from "./state";

export function ActivityPicker() {
  const [state, setState] = useState(() => {
    return loadState(activityStateKey);
  });

  useEffect(() => {
    saveState(activityStateKey, state);
  }, [state]);

  const [debug, setDebug] = useState(false);

  const [activeActivityId, activeActivity] = getActiveActivity(state);

  const [showCreateActivity, setShowCreateActivity] = useState(false);

  return (
    <>
      <div
        id="container"
        className="flex flex-col-reverse justify-start text-left"
      >
        {!showCreateActivity &&
          (!activeActivity || (activeActivity && activeActivity.stop)) && (
            <FullContainer className="flex items-stretch">
              <button
                className="box-content m-8 w-full text-2xl rounded-md shadow-sm opacity-50 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
                onClick={() => {
                  setShowCreateActivity(true);
                }}
              >
                New activity
              </button>
            </FullContainer>
          )}

        {showCreateActivity &&
          (() => {
            const id = uuidv4();
            return (
              <FullContainer>
                <ActivityView
                  id={id}
                  editable={true}
                  activity={{}}
                  newActivity={true}
                  setActivity={(activity: Activity) => {
                    endCurrentActivity();
                    setState((state) => {
                      return {
                        ...state,
                        [id]: activity,
                      };
                    });
                    setShowCreateActivity(false);
                  }}
                  deleteActivity={() => {
                    setShowCreateActivity(false);
                  }}
                />
              </FullContainer>
            );
          })()}

        {Object.entries(state)
          .reverse()
          .map(([id, activity]) => {
            const isActive = activeActivityId === id;
            let activityView = (
              <ActivityView
                key={id}
                id={id}
                editable={isActive}
                activity={activity}
                newActivity={false}
                setActivity={(activity: Activity) => {
                  setState((state) => {
                    return {
                      ...state,
                      [id]: activity,
                    };
                  });
                }}
                deleteActivity={() => {
                  setState((state) => {
                    const newState = { ...state };
                    delete newState[id];
                    return newState;
                  });
                }}
              />
            );
            if (isActive) {
              return (
                <FullContainer
                  key={id}
                  className="flex flex-col justify-between flex-grow flex-shrink-0"
                >
                  {activityView}
                  <button
                    className="m-8 px-4 py-2 text-2xl rounded-md shadow-sm opacity-50 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    onClick={() => {
                      endCurrentActivity();
                    }}
                  >
                    Stop
                  </button>
                </FullContainer>
              );
            } else {
              return activityView;
            }
          })}
      </div>

      {debug && (
        <div className="fixed max-h-screen right-0 p-8 top-0 bg-slate-500 bg-opacity-80 rounded-md overflow-auto">
          <pre>{JSON.stringify(state, null, 2)}</pre>
          <button
            onClick={() => {
              window.location.reload();
            }}
          >
            reload
          </button>
        </div>
      )}

      <button
        className="opacity-25 fixed right-0 bottom-0"
        onClick={() => {
          setDebug(!debug);
        }}
      >
        Toggle debug
      </button>
    </>
  );
  function endCurrentActivity() {
    setState((state) => {
      const newState = { ...state };
      const id = Object.keys(newState)[Object.keys(newState).length - 1];
      const activity = { ...newState[id] };
      activity.stop = new Date();
      newState[id] = activity;
      return newState;
    });
  }
}

function FullContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`h-[300px] ${className}`}>{children}</div>;
}

function ActivityView({
  className,
  newActivity,
  activity,
  editable,
  setActivity,
  deleteActivity,
}: {
  newActivity: boolean;
  activity: Activity;
  id: string;
  setActivity: (activity: Activity) => void;
  editable?: boolean;
  className?: string;
  deleteActivity: () => void;
}) {
  const [start, setStart] = useState<Date | undefined>(activity.start);
  const [value, setValue] = useState(activity.value);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") {
      return;
    }
    if (activity.stop) {
      save();
      return;
    }
    if (start) {
      save();
      return;
    }
    setStart(new Date());
  };

  const initialRender = useRef(true);

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    save();
  }, [start]);

  function save() {
    setActivity({
      ...activity,
      value: value,
      start,
    });
  }

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

  // Seconds remaining:
  const timeSpentMillis = start ? Date.now() - start.getTime() : 0;
  const formattedStartDate = start ? format(start, "h:mm a") : "";

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (newActivity && ref.current) {
      ref.current.scrollIntoView();
    }
  }, [newActivity]);

  const duration = intervalToDuration({ start: 0, end: timeSpentMillis });
  const timeSpentString = formatDuration(duration);

  return (
    <div
      ref={ref}
      className={["flex flex-col mx-8 mt-12", className].join(" ")}
    >
      <div className="flex justify-between stretch">
        <p className="">{formattedStartDate}</p>
        <button onClick={deleteActivity}>x</button>
      </div>
      {editable && (
        <input
          type="text"
          placeholder="What are you committing to single-tasking on right now?"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={save}
          className="mt-3 px-4 py-2 text-2xl border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 flex-1"
        />
      )}
      {!editable && <p className="">{value}</p>}
      {!activity.stop && <p className="mt-8">{timeSpentString}</p>}
    </div>
  );
}

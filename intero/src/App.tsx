import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";
import { useGlobalShortcut } from "./use_global_shortcut";
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { intervalToDuration, formatDuration } from 'date-fns';

interface AppState {
  [id: string]: Activity;
}

interface Activity {
  value?: string;
  start?: Date;
  stop?: Date;
  deadline?: Date;
}

function App() {
  useGlobalShortcut();


  const initialState: AppState = (() => {
    const str = localStorage.getItem('state');
    function makeFallbackState() {
      return {};
    }
    if (!str) {
      return makeFallbackState();
    }
    try {
      const obj = JSON.parse(str);
      let outputObj: AppState = {};
      for (let [key, value] of Object.entries(obj)) {
        outputObj[key] = parseActivity(value as Activity);
      }

      if (Object.keys(outputObj).length === 0) {
        return makeFallbackState();
      }

      function parseActivity(obj: Activity) {
        return {
          start: obj.start ? new Date(obj.start) : undefined,
          stop: obj.stop ? new Date(obj.stop) : undefined,
          value: obj.value,
          deadline: obj.deadline ? new Date(obj.deadline) : undefined,
        };
      }
      return outputObj;
    } catch (e) {
      return makeFallbackState();
    }
  })();


  const [state, setState] = useState(initialState);

  useEffect(() => {
    localStorage.setItem('state', JSON.stringify(state));
  }, [state])


  const [debug, setDebug] = useState(false);

  const [activeActivityId, activeActivity] = (() => {
    const id = Object.keys(state)[Object.keys(state).length - 1];
    const activity = state[id];
    if (activity.stop) {
      return [undefined, undefined];
    }
    return [id, activity];
  })();

  const [showCreateActivity, setShowCreateActivity] = useState(false);
  console.log(showCreateActivity);

  return (
    <>
      <div id="container" className="p-10 flex flex-col justify-start text-left">
        {!showCreateActivity && activeActivity && !activeActivity.stop && <button className="mt-16 px-4 py-2 text-2xl rounded-md shadow-sm opacity-50 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" onClick={() => {
          endCurrentActivity();
        }}>Stop</button>}
        {!showCreateActivity && (!activeActivity || (activeActivity && activeActivity.stop)) && <button className="mt-16 px-4 py-2 text-2xl rounded-md shadow-sm opacity-50 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" onClick={() => {
          setShowCreateActivity(true);
        }}>New activity</button>}

        <div id="anchor"></div>

        {showCreateActivity && (() => {
          const id = uuidv4();
          return <>
            <ActivityView
              className="my-40"
              id={id} activity={{}} newActivity={true} setActivity={(activity: Activity) => {
                endCurrentActivity();
                setState((state) => {
                  return {
                    ...state,
                    [id]: activity,
                  };
                });
                setShowCreateActivity(false);
              }} deleteActivity={() => {
                setShowCreateActivity(false);
              }} />
          </>
        })()
        }

        {Object.entries(state).reverse().map(([id, activity], i) => {
          return <ActivityView
            className={id === activeActivityId ? "my-36" : ""}
            key={id} id={id} activity={activity} newActivity={false} setActivity={
              (activity: Activity) => {
                setState((state) => {
                  return {
                    ...state,
                    [id]: activity,
                  };
                });
              }
            }
            deleteActivity={() => {
              setState((state) => {
                const newState = { ...state };
                delete newState[id];
                return newState;
              });
            }}
          />;
        })}

      </div>

      {debug && <div className="fixed max-h-screen right-0 p-8 top-0 bg-slate-500 bg-opacity-80 rounded-md overflow-auto">
        <pre>
          {JSON.stringify(state, null, 2)}
        </pre>
        <button onClick={
          () => {
            window.location.reload();
          }
        }>
          reload
        </button>
      </div>}

      <button className="opacity-25 fixed right-0 bottom-0" onClick={() => {
        setDebug(!debug);
      }}>Toggle debug</button>
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

function ActivityView({ className, newActivity, activity, setActivity, deleteActivity }: { newActivity: boolean, activity: Activity, id: string, setActivity: (activity: Activity) => void, className?: string, deleteActivity: () => void }) {
  const [start, setStart] = useState<Date | undefined>(activity.start);
  const [value, setValue] = useState(activity.value)
  const [deadline, setDeadline] = useState<Date | undefined>(activity.deadline);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') {
      return;
    }
    if (activity.stop) {
      return;
    }
    if (start) {
      return;
    }
    setStart(new Date());
    setDeadline(new Date(Date.now() + 15 * 60 * 1000));
  }

  const initialRender = useRef(true);
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    setActivity({
      ...activity,
      value: value,
      start,
      deadline,
    });
  }, [start, deadline])


  const [_interval, setInterval] = useState<number | null>(null);
  const [_tick, setTick] = useState(0);

  // TODO: clear interval after timer ends.
  useEffect(() => {
    if (deadline) {
      setInterval(window.setInterval(() => {
        setTick(tick => tick + 1);
      }, 1000));

      return () => {
        setInterval((interval: number | null) => {
          if (interval) {
            window.clearInterval(interval);
          }
          return null
        })
      }
    }
  }, [deadline]);

  // Seconds remaining:
  const timeSpentMillis = start ? ((Date.now() - start.getTime())) : 0;
  const formattedStartDate = start ? format(start, 'h:mm a') : '';

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (newActivity && ref.current) {
      ref.current.scrollIntoView();
    }
  }, [newActivity]);


  const duration = intervalToDuration({ start: 0, end: timeSpentMillis });
  const timeSpentString = formatDuration(duration);

  return (
    <div ref={ref} className={["flex flex-col", className].join(" ")}>
      <div className="flex justify-between stretch">
        <p className="mt-8">{formattedStartDate}</p>
        <button onClick={deleteActivity} >x</button>
      </div>
      <input
        type="text"
        placeholder="What are you committing to single-tasking on right now?"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="mt-3 px-4 py-2 text-2xl border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
      />
      {!activity.stop && deadline && <p className="mt-8">{timeSpentString}</p>}
    </div>
  );
}

export default App;

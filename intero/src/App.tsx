import { useState, useMemo, useCallback } from "react";
import { ActivityPicker } from "./ActivityPicker";
import "./App.css";
import { useGlobalShortcut } from "./use_global_shortcut";
import { ErrorBoundary } from "./ErrorBoundary";
import { produce, Draft } from "immer";
import { Canvas } from "./Canvas";
import {
  SetErrorContext,
  StateManagerContext,
  ToposorterState,
  ToposorterStateData,
  useLocalStorageState,
  withNormalization,
} from "./ToposorterState";
import { ReactFlowProvider } from "reactflow";
import { SelectionPane } from "./SelectionPane";

function App() {
  useGlobalShortcut();

  return (
    <ErrorBoundary>
      <ToposorterView />
    </ErrorBoundary>
  );
}

function ToposorterView() {
  const [state, setState] = useLocalStorageState<ToposorterStateData>(
    "toposorter",
    {
      nodes: {},
    },
    produce((_draft: Draft<ToposorterStateData>) => {})
  );

  const [error, setError] = useState<null | Error>(null);

  const trySetState = useCallback(
    (fn: (value: ToposorterStateData) => ToposorterStateData) => {
      setState((state) => {
        try {
          return fn(state);
        } catch (e: unknown) {
          console.error(e);
          setError(e as Error);
          return state;
        }
      });
    },
    [setState, setError]
  );

  const stateManager = useMemo(() => {
    return {
      addNode: (value: string) => {
        trySetState(withNormalization(ToposorterState.addNode(value)));
      },
      deleteNode: (idPrefix: string) => {
        trySetState(withNormalization(ToposorterState.deleteNode(idPrefix)));
      },
      addEdge: (fromPrefix: string, toPrefix: string) => {
        trySetState(
          withNormalization(ToposorterState.addEdge(fromPrefix, toPrefix))
        );
      },
      setStatus: (idPrefix: string, status: string) => {
        trySetState(
          withNormalization(ToposorterState.setStatus(idPrefix, status))
        );
      },
      setValue: (idPrefix: string, value: string) => {
        trySetState(
          withNormalization(ToposorterState.setValue(idPrefix, value))
        );
      },
    };
  }, [setState, trySetState]);

  return (
    <ReactFlowProvider>
      <StateManagerContext.Provider value={stateManager}>
        <SetErrorContext.Provider value={setError}>
          <div className="absolute bg-black bg-opacity-50 h-full w-full flex justify-start items-start">
            <div className="flex-1 flex flex-col items-start m-[3%] space-y-8 p-8 w-[94%] rounded-xl h-[94%] bg-black">
              <Canvas nodes={state.nodes} />
              {error && (
                <pre className="bg-red-100 text-red-500 m-8 p-8 rounded-xl text-bold absolute right-0 top-0">
                  Error: {error.message}
                </pre>
              )}
            </div>
            <div className="flex-0 flex-grow-0 flex-shrink flex flex-col items-start m-[3%] w-[600px] space-y-8 rounded-xl h-[94%]">
              <div className="flex-0 basis-[300px] flex flex-col-reverse w-full overscroll-none overflow-y-scroll bg-black rounded-xl">
                <ErrorBoundary>
                  <ActivityPicker />
                </ErrorBoundary>
              </div>
              <SelectionPane />
            </div>
          </div>
        </SetErrorContext.Provider>
      </StateManagerContext.Provider>
    </ReactFlowProvider>
  );
}

export default App;

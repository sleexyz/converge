import "./App.css";
import { useGlobalShortcut } from "./use_global_shortcut";
import { ErrorBoundary } from "./ErrorBoundary";
import { Canvas } from "./Canvas";
import {
  ToposorterStateProvider,
  useError,
  useToposorterState,
} from "./ToposorterState";
import { ReactFlowProvider } from "reactflow";
import { SelectionPane } from "./SelectionPane";
import { SelectionProvider, useSelectedNode } from "./Selection";
import { ActivityLogProvider, useSyncActivityState } from "./activity";
import { useEffect } from "react";

function App() {
  useGlobalShortcut();

  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <ToposorterStateProvider>
          <ActivityLogProvider>
            <SelectionProvider>
              <ToposorterView />
            </SelectionProvider>
          </ActivityLogProvider>
        </ToposorterStateProvider>
      </ReactFlowProvider>
    </ErrorBoundary>
  );
}

function ToposorterView() {
  const state = useToposorterState();
  const error = useError();

  useSyncActivityState();
  useSelectActiveOnWake();

  return (
    <div className="absolute bg-black bg-opacity-50 h-full w-full flex justify-start items-start">
      <div className="flex-1 flex flex-col items-start m-[3%] space-y-8 p-8 w-[94%] rounded-xl h-[94%] bg-black">
        <Canvas nodes={state.getNodes()} />
      </div>
      <div className="flex-0 flex-grow-0 flex-shrink flex flex-col items-start m-[3%] w-[600px] space-y-8 rounded-xl h-[94%]">
      {error && (
          <pre className="bg-red-100 text-red-500 m-8 p-8 rounded-xl text-bold fixed right-0 top-0">
            Error: {error.message}
          </pre>
        )}
        {/* <div className="flex-0 basis-[300px] flex flex-col-reverse w-full overscroll-none overflow-y-scroll bg-black rounded-xl">
          <ErrorBoundary>
            <ActivityPicker />
          </ErrorBoundary>
        </div> */}
        <SelectionPane />
      </div>
    </div>
  );
}

function useSelectActiveOnWake() {
  const state = useToposorterState();
  const activeNode = state.getActiveNode();
  const [, setSelectedNode] = useSelectedNode();

  useEffect(() => {
    function onVisibilityChange() {
      if (!document.hidden) {
        setSelectedNode(activeNode?.id ?? null);
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [activeNode]);
}

export default App;

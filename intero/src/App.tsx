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
import { CanvasController } from "./canvas_controller";
import { ActionManagerProvider } from "./action_manager";

function App() {
  useGlobalShortcut();

  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <ToposorterStateProvider>
          <ActivityLogProvider>
            <SelectionProvider>
              <CanvasController>
                <ActionManagerProvider>
                  <ToposorterView />
                </ActionManagerProvider>
              </CanvasController>
            </SelectionProvider>
          </ActivityLogProvider>
        </ToposorterStateProvider>
      </ReactFlowProvider>
    </ErrorBoundary>
  );
}

function ToposorterView() {
  const error = useError();

  useSyncActivityState();
  useSelectActiveOnWake({
    onWake: false,
  });

  return (
    <div className="absolute bg-black bg-opacity-50 h-full w-full flex justify-start items-start">
      <div className="flex-1 flex flex-col items-start m-[3%] space-y-8 p-8 w-[94%] rounded-xl h-[94%] bg-black">
        <Canvas />
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

function useSelectActiveOnWake({ onWake }: { onWake: boolean }) {
  const state = useToposorterState();
  const activeNode = state.getActiveNode();
  const [, setSelectedNode] = useSelectedNode();

  function startView() {
    setSelectedNode(activeNode?.id ?? null);
  }

  useEffect(() => {
    startView();
  }, []);

  useEffect(() => {
    if (onWake) {
      return () => {};
    }
    function onVisibilityChange() {
      if (!document.hidden) {
        startView();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [activeNode]);
}

export default App;

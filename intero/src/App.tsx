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
  

  return (
    <div className="absolute h-full w-full flex justify-start items-start">
      <div className="w-full h-full flex flex-1">
        <Canvas />
        {error && (
          <pre className="fixed bottom-0 right-0 bg-red-100 text-red-500 m-8 p-8 rounded-xl text-bold">
            Error: {error.message}
          </pre>
        )}
      </div>
    </div>
  );
}

export default App;

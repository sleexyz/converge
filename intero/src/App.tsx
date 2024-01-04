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
  ToposorterStateProvider,
  useError,
  useLocalStorageState,
  useToposorterState,
  withNormalization,
} from "./ToposorterState";
import { ReactFlowProvider } from "reactflow";
import { SelectionPane } from "./SelectionPane";
import { SelectionProvider } from "./Selection";

function App() {
  useGlobalShortcut();

  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <ToposorterStateProvider>
          <SelectionProvider>
            <ToposorterView />
          </SelectionProvider>
        </ToposorterStateProvider>
      </ReactFlowProvider>
    </ErrorBoundary>
  );
}

function ToposorterView() {
  const state = useToposorterState();
  const error = useError();

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
        <div className="flex-0 basis-[300px] flex flex-col-reverse w-full overscroll-none overflow-y-scroll bg-black rounded-xl">
          <ErrorBoundary>
            <ActivityPicker />
          </ErrorBoundary>
        </div>
        <SelectionPane />
      </div>
    </div>
  );
}

export default App;

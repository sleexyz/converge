import { useContext } from "react";
import * as React from "react";
import {
  Id,
  ToposorterStateManager,
  ToposorterStateManagerContext,
} from "./ToposorterState";
import { UIState, UIStateContext } from "./ui_state";
import { useSelectedNode } from "./Selection";
import { CanvasManager, CanvasManagerContext, Status, statusToPoints } from "./canvas_controller";

export class ActionManager {
  constructor(
    readonly stateManager: ToposorterStateManager,
    readonly canvasManager: CanvasManager,
    readonly setSelectedNode: (id: Id | null) => Promise<void>,
    readonly uiState: UIState
  ) {
  }

  async selectNode(id: Id) {
    await this.setSelectedNode(id);
    await this.canvasManager.layoutNodesAndCenterSelected();
  }

  async add(from?: Id, connectionType?: "parent" | "child") {
    const id = await this.stateManager.add(from, connectionType);
    await this.canvasManager.waitForPropagation();
    await this.setSelectedNode(id);
    this.uiState.focusTitle();

    await this.canvasManager.layoutNodesAndCenterSelected();
  }

  async setStatus(id: Id, status: string) {
    const oldStatus = this.stateManager.state().getNode(id).status;
    await this.stateManager.setStatus(id, status);
    await this.canvasManager.waitForPropagation();

    const oldStatusPoints = statusToPoints(oldStatus);
    const newStatusPoints = statusToPoints(status === "unset" ? undefined : status as Status);
    if (newStatusPoints < oldStatusPoints) {
      return
    }
    await this.setSelectedNode(id);
    await this.canvasManager.layoutNodesAndCenterSelected();
  }
}

export const ActionManagerContext = React.createContext<ActionManager | null>(
  null
);

export function ActionManagerProvider(props: { children: React.ReactNode }) {
  const stateManager = useContext(ToposorterStateManagerContext)!;
  const [, setSelectedNode] = useSelectedNode();
  const uiState = useContext(UIStateContext)!;

  // TODO: see why this is created twice.
  const canvasManager = useContext(CanvasManagerContext)!;

  const actionManager = React.useMemo(() => {
    return new ActionManager(
      stateManager,
      canvasManager,
      setSelectedNode,
      uiState
    );
  }, [stateManager, canvasManager, setSelectedNode, uiState]);

  return (
    <ActionManagerContext.Provider value={actionManager}>
      {props.children}
    </ActionManagerContext.Provider>
  );
}

import { useContext } from "react";
import * as React from "react";
import {
  Id,
  Status,
  ToposorterStateManager,
  ToposorterStateManagerContext,
  statusToPoints,
} from "./ToposorterState";
import { UIState, UIStateContext } from "./ui_state";
import { SelectionManager, SelectionManagerContext, useSelectedNode } from "./Selection";
import { CanvasManager, CanvasManagerContext} from "./canvas_controller";

export class ActionManager {
  constructor(
    readonly stateManager: ToposorterStateManager,
    readonly selectionManager: SelectionManager,
    readonly canvasManager: CanvasManager,
    readonly setSelectedNode: (id: Id | null) => Promise<void>,
    readonly uiState: UIState
  ) {
  }

  async selectNode(id: Id) {
    await this.setSelectedNode(id);
    this.canvasManager.center(id);
  }

  async add(from?: Id, connectionType?: "parent" | "child") {
    const id = await this.stateManager.add(from, connectionType);
    await this.canvasManager.waitForPropagation();
    await this.setSelectedNode(id);
    // TODO: bake this into setSelectedNode
    this.uiState.updateFocus(this.selectionManager, this.stateManager);
    this.uiState.focusTitle();

    await this.canvasManager.layoutNodesAndCenterSelected();
  }

  async setPriority(id: Id, priority: number) {
    await this.stateManager.setPriority(id, priority);

    await this.setSelectedNode(id);
    await this.canvasManager.layoutNodesAndCenterSelected();
  }

  async setPinned(id: Id, value: boolean) {
    await this.stateManager.setPinned(id, value);
    await this.canvasManager.waitForPropagation();

    await this.setSelectedNode(id);
    await this.canvasManager.layoutNodesAndCenterSelected();
  }

  async setType(id: Id, type: string) {
    await this.stateManager.setType(id, type);
    await this.canvasManager.waitForPropagation();

    await this.setSelectedNode(id);
    await this.canvasManager.layoutNodesAndCenterSelected();
  }

  async setStatus(id: Id, status: string) {
    const oldStatus = this.stateManager.state().getNode(id).status;
    await this.stateManager.setStatus(id, status);
    await this.canvasManager.waitForPropagation();

    const oldStatusPoints = statusToPoints(oldStatus);
    const newStatusPoints = statusToPoints(status === "unset" ? undefined : status as Status);
    if (newStatusPoints < oldStatusPoints) {
      await this.canvasManager.layoutNodes();
      return
    }

    await this.setSelectedNode(id);
    await this.canvasManager.layoutNodes();
    this.canvasManager.center(id);
  }
}

export const ActionManagerContext = React.createContext<ActionManager | null>(
  null
);

export function ActionManagerProvider(props: { children: React.ReactNode }) {
  const stateManager = useContext(ToposorterStateManagerContext)!;
  const selectionManager = useContext(SelectionManagerContext)!;
  const [, setSelectedNode] = useSelectedNode();
  const uiState = useContext(UIStateContext)!;

  // TODO: see why this is created twice.
  const canvasManager = useContext(CanvasManagerContext)!;

  const actionManager = React.useMemo(() => {
    return new ActionManager(
      stateManager,
      selectionManager,
      canvasManager,
      setSelectedNode,
      uiState
    );
  }, [stateManager, selectionManager, canvasManager, setSelectedNode, uiState]);

  return (
    <ActionManagerContext.Provider value={actionManager}>
      {props.children}
    </ActionManagerContext.Provider>
  );
}

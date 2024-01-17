import { SetStateAction, useContext } from "react";
import * as React from "react";
import { Id, ToposorterStateManager, ToposorterStateManagerContext } from "./ToposorterState";
import { UIState, UIStateContext } from "./ui_state";
import { useSelectedNode } from "./Selection";
import { CanvasManager, CanvasManagerContext } from "./canvas_controller";

export class ActionManager {
  constructor(
    readonly stateManager: ToposorterStateManager,
    readonly canvasManager: CanvasManager,
    readonly setSelectedNode: React.Dispatch<SetStateAction<Id | null>>,
    readonly uiState: UIState
  ) {}

  async addNode(value?: string) {
    const id = await this.stateManager.addNode(value);
    await this.selectAdded(id);
  }

  async add(from: Id, connectionType: "parent" | "child") {
    const id = await this.stateManager.add(from, connectionType);
    await this.selectAdded(id);
  }

  private async selectAdded(id: Id) {
    this.setSelectedNode(id);
    this.uiState.focusTitle();

    await this.canvasManager.layoutNodes();
    console.log("centering", id);
    this.canvasManager.center(id);

  }
}

export const ActionManagerContext = React.createContext<ActionManager | null>(null);

export function ActionManagerProvider(props: { children: React.ReactNode }) {
    const stateManager = useContext(ToposorterStateManagerContext)!;
    const [, setSelectedNode] = useSelectedNode();
    const uiState = useContext(UIStateContext)!;
    const canvasManager = useContext(CanvasManagerContext)!;

    const actionManager = React.useMemo(() => {
        return new ActionManager(stateManager, canvasManager, setSelectedNode, uiState);
    }, [stateManager, setSelectedNode, uiState]);

  return (
    <ActionManagerContext.Provider value={actionManager}>
      {props.children}
    </ActionManagerContext.Provider>
  );
}

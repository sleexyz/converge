import * as React from "react";
import { Id, ToposorterStateManager } from "./ToposorterState";
import { SelectionManager } from "./Selection";

export class UIState {

    commandLineRef: React.RefObject<HTMLInputElement> | null = null;
    bindCommandLineRef = (ref: React.RefObject<HTMLInputElement> | null) => {
        this.commandLineRef = ref;
    };
    focusCommandLine = () => {
        this.commandLineRef?.current?.focus();
    };

    titleRef: React.RefObject<HTMLTextAreaElement> | null = null;
    bindTitleRef = (ref: React.RefObject<HTMLTextAreaElement> | null) => {
        this.titleRef = ref;
    };
    focusTitle = () => {
        this.titleRef?.current?.focus();
    };

    // TODO: move these to SelectionManager

    lastFocus: {id: Id, index: number} | null = null;

    // TODO: bind selection manager and toposorterStateManager to UIState
    rotateFocus = (id: Id, selectionManager: SelectionManager, toposorterStateManager: ToposorterStateManager) => {
        let lastFocusIndex = this.lastFocus?.id === id ? this.lastFocus.index : (this.lastFocus?.index ?? 0) - 1;
        let focusIndex = (lastFocusIndex + 1) % 2;
        this.lastFocus = {id, index: focusIndex};
        this.updateFocus(selectionManager, toposorterStateManager);
    }

    public updateFocus = (selectionManager: SelectionManager, toposorterStateManager: ToposorterStateManager) => {
        if (!this.lastFocus) {
            return;
        }
        const id = this.lastFocus.id;
        const fns = [
            () => { 
                this.focusTitle();
                selectionManager.setRelevantNodes(null);
            },
            () => {
                selectionManager.setRelevantNodes(toposorterStateManager.state().getRelevantNodesForSelection(id));
            },
        ];
        fns[this.lastFocus.index]();
    }
}

export const UIStateContext = React.createContext<UIState>(new UIState());
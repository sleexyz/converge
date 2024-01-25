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

    lastFocus: {id: Id, index: number} | null = null;

    rotateFocus = (id: Id, selectionManager: SelectionManager, toposorterStateManager: ToposorterStateManager) => {
        // if (this.lastFocus && this.lastFocus.id !== id) {
        //     return this.lastFocus.id;
        // }
        let lastFocusIndex = this.lastFocus?.id === id ? this.lastFocus.index : (this.lastFocus?.index ?? 0) - 1;
        const fns = [
            () => { 
                this.focusTitle();
                selectionManager.setRelevantNodes(null);
            },
            () => {
                selectionManager.setRelevantNodes(toposorterStateManager.state().getRelevantNodesForSelection(id));
            },
        ];
        let focusIndex = (lastFocusIndex + 1) % fns.length;
        fns[focusIndex]();
        this.lastFocus = {id, index: focusIndex};
    }
}

export const UIStateContext = React.createContext<UIState>(new UIState());
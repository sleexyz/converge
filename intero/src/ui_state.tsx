import * as React from "react";

class UIState {
    commandLineRef: React.RefObject<HTMLInputElement> | null = null;
    bindCommandLineRef = (ref: React.RefObject<HTMLInputElement> | null) => {
        this.commandLineRef = ref;
    };
    focusCommandLine = () => {
        this.commandLineRef?.current?.focus();
    };
}

export const UIStateContex = React.createContext<UIState>(new UIState());
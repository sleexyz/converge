import * as PIXI from 'pixi.js';
import { Stage } from '@pixi/react';
import { Live2DModel } from 'pixi-live2d-display';
import { useRef, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

(window as any).PIXI = PIXI;

interface MouseMoved {
    x: number;
    y: number;
    window_x: number;
    window_y: number;
    window_width: number;
    window_height: number;
}

export function XEyes() {
    const modelRef = useRef<Live2DModel | null>(null);

    const [inWindow, setInWindow] = useState(false);

    useEffect(() => {
        const unlistenPromise = listen('mouse-moved', (event) => {
            const mouseMoved = event.payload as MouseMoved;
            const x = mouseMoved.x - mouseMoved.window_x;
            const y = mouseMoved.window_height - (mouseMoved.y - mouseMoved.window_y);
            if (modelRef.current) {
                let model = modelRef.current;
                model.focus(x, y);
            }

            const cursorInWindow = x >= 0 && x <= mouseMoved.window_width && y >= 0 && y <= mouseMoved.window_height;
            if (cursorInWindow) {
                setInWindow(true);
            } else {
                setInWindow(false);
            }
        });
        return () => {
            unlistenPromise.then((unlisten) => {
                unlisten();
            });
        };
    }, []);


    const onMount = async (app: PIXI.Application) => {
        // let config = { url: "https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json", scale: 0.4 };
        // let config = { url: "https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json", scale: 0.4 };
        let config = { url: "/assets/model21.json", scale: 1 };
        const model2 = await Live2DModel.from(config.url);

        if (!model2) {
            throw new Error("Failed to load model");
        }

        app.stage.addChild(model2);
        model2.scale.set(config.scale);
        modelRef.current = model2;
    };

    let classes = "transition-opacity duration-1000";
    if (inWindow) {
        classes += " opacity-10";
    } else {
        classes += " opacity-100";
    }

    return (
        <Stage
            className={classes}
            options={{ resizeTo: window, backgroundAlpha: 0 }}
            onMount={onMount}
        >
        </Stage>
    );
}
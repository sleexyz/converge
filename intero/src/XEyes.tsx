import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display';
import { useRef } from "react";
import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

window.PIXI = PIXI;

interface MouseMoved {
    x: number;
    y: number;
    window_x: number;
    window_y: number;
    window_width: number;
    window_height: number;
}

export function XEyes() {
    const modelRef = useRef<Live2DModel>(null);

    useEffect(() => {
        const unlistenPromise = listen('mouse-moved', (event) => {
            const mouseMoved = event.payload as MouseMoved;
            const x = mouseMoved.x - mouseMoved.window_x;
            const y = mouseMoved.window_height - (mouseMoved.y - mouseMoved.window_y);
            if (modelRef.current) {
                let model = modelRef.current;
                model.focus(x, y);
            }
        });
        return () => {
            unlistenPromise.then((unlisten) => {
                unlisten();
            });
        };
    }, []);


    const canvasRef = async (canvas: HTMLCanvasElement) => {
        const app = new PIXI.Application({
            view: canvas,
            resizeTo: window,
            backgroundAlpha: 0,
            backgroundColor: 0x000000,
        });

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

    return (<canvas ref={canvasRef} />);
}
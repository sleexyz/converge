import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

interface MouseMoved {
    // Screen coordinates
    window_x: number;
    window_y: number;
    x: number;
    y: number;

    window_width: number;
    window_height: number;
}

export function XEyes() {
    let [mouseMoved, setMouseMoved] = useState<MouseMoved>({ x: 0, y: 0, window_x: 0, window_y: 0, window_width: 0, window_height: 0 });

    const x = mouseMoved.x - mouseMoved.window_x;
    const y = mouseMoved.y - mouseMoved.window_y;

    const position = { x, y };

    useEffect(() => {
        const unlistenPromise = listen('mouse-moved', (event) => {
            setMouseMoved(event.payload as any);
        });
        return () => {
            unlistenPromise.then((unlisten) => {
                unlisten();
            });
        };
    }, []);

    return <div className="flex justify-end bg-black bg-opacity-80 rounded-xl p-2">
        <pre className="text-xs">
            {JSON.stringify(position, null, 2)}
        </pre>
    </div>;

}
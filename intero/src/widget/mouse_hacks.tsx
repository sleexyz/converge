import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

export interface MouseMoved {
  x: number;
  y: number;
  window_x: number;
  window_y: number;
  window_width: number;
  window_height: number;
}

export function useMousePosition() {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const unlistenPromise = listen("mouse-moved", (event) => {
      const mouseMoved = event.payload as MouseMoved;
      const x = mouseMoved.x - mouseMoved.window_x;
      const y = mouseMoved.window_height - (mouseMoved.y - mouseMoved.window_y);
      setCoords({ x, y });
    });
    return () => {
      unlistenPromise.then((unlisten) => {
        unlisten();
      });
    };
  }, []);
  return coords;
}

export function useInWindow(elem: Element | null) {
  const mouseCoords = useMousePosition();

  const rect = elem?.getBoundingClientRect();

  let inWindow = false;
  if (rect) {
    if (
      mouseCoords.x >= rect.x &&
      mouseCoords.x <= rect.x + rect.width &&
      mouseCoords.y >= rect.y &&
      mouseCoords.y <= rect.y + rect.height
    ) {
      inWindow = true;
    }
  }
  return inWindow;
}

function useInWindowOld() {
  const [inWindow, setInWindow] = useState(false);
  useEffect(() => {
    const unlistenPromise = listen("mouse-moved", (event) => {
      const mouseMoved = event.payload as MouseMoved;
      const x = mouseMoved.x - mouseMoved.window_x;
      const y = mouseMoved.window_height - (mouseMoved.y - mouseMoved.window_y);
      const cursorInWindow =
        x >= 0 &&
        x <= mouseMoved.window_width &&
        y >= 0 &&
        y <= mouseMoved.window_height;
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
  return inWindow;
}

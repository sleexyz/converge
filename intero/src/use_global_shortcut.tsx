import { invoke } from "@tauri-apps/api";
import { listen } from "@tauri-apps/api/event";
import {
  register as registerGlobalShortcut,
  unregister as unregisterGlobalShortcut,
} from "@tauri-apps/api/globalShortcut";
import { useEffect } from "react";

export function useGlobalShortcut() {
  const hotkey = "CommandOrControl+Escape";

  useEffect(() => {
    reregister(hotkey, () => {
      invoke("toggle_panel");
    });

    const unlisten = listen("setting_window:close", async () => {
      await register(hotkey, () => {
        invoke("toggle_panel");
      });
    });

    return () => {
      unregister(hotkey);
      unlisten.then((f) => f());
    };
  }, [hotkey]);
}

async function reregister(hotkey: string, callback: () => void) {
  await unregister(hotkey);
  await register(hotkey, callback);
}

function register(hotkey: string, callback: () => void) {
  registerGlobalShortcut(hotkey, callback).then(() => {
    console.debug(`registered ${hotkey}`);
  });
}

function unregister(hotkey: string) {
  unregisterGlobalShortcut(hotkey).then(() => {
    console.debug(`unregistered ${hotkey}`);
  });
}

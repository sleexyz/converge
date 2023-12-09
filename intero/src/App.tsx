import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";
import { useGlobalShortcut } from "./use_global_shortcut";

function App() {
  useGlobalShortcut();
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        invoke("hide_panel");
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup function to remove the event listener when the component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="container">
      <h1>Welcome to Tauri!</h1>
    </div>
  );
}

export default App;

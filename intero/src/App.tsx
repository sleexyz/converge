import { ActivityPicker } from "./ActivityPicker";
import "./App.css";
import { useGlobalShortcut } from "./use_global_shortcut";


function App() {
  useGlobalShortcut();

  return <>
    <ActivityPicker />
  </>

}

export default App;

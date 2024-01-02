import { ActivityPicker } from "./ActivityPicker";
import "./App.css";
import { useGlobalShortcut } from "./use_global_shortcut";

function App() {
  useGlobalShortcut();

  return (
    <div className="fixed bg-black bg-opacity-50 h-full w-full overflow-hidden overscroll-none flex justify-center items-end">
      <div className="h-[400px] overflow-y-scroll overscroll-none bg-black bg-opacity-90 rounded-xl w-max-[80%] flex flex-col-reverse">
        <ActivityPicker />
      </div>
    </div>
  );
}

export default App;

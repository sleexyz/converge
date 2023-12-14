import { useEffect, useState } from "react";
import { getActiveActivity, loadState } from "./state";
import "./WidgetView.css";
import { XEyes } from "./XEyes";
// import { format } from 'date-fns';

export function WidgetView() {
    const [state, setState] = useState(() => {
        return loadState();
    });

    useEffect(() => {
        function listener() {
            setState(loadState());
        }
        window.addEventListener("storage", listener);
        return () => {
            window.removeEventListener("storage", listener);
        };
    }, []);

    const [id, activity] = getActiveActivity(state);
    if (!id) {
        return <></>
    }

    // const start = activity.start;
    // const formattedStartDate = start ? format(start, 'h:mm a') : '';

    return (
        // <div id="widget-container" className="rounded-xl h-screen flex items-center justify-center">
        //     <div
        //         className="text-xl"
        //     >{activity.value}</div>
            <XEyes />
        // </div>
    );
}
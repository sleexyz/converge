import * as React from "react";
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

    // const [id, activity] = getActiveActivity(state);
    // if (!id) {
    //     return <></>
    // }

    // const start = activity.start;
    // const formattedStartDate = start ? format(start, 'h:mm a') : '';

    return (
        // <div id="widget-container" className="rounded-xl h-screen flex items-center justify-center bg-black">
        //     <div>
        //         {activity.value}
        //     </div>
        // </div>
        <XEyes />
    );
}

class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false };
    }
  
    static getDerivedStateFromError(error) {
      // Update state so the next render will show the fallback UI.
      return { hasError: true };
    }
  
    componentDidCatch(error, errorInfo) {
      // You can also log the error to an error reporting service
      console.error(error, errorInfo);
    }
  
    render() {
      if (this.state.hasError) {
        // You can render any custom fallback UI
        return <h1>Something went wrong.</h1>;
      }
  
      return this.props.children; 
    }
  }
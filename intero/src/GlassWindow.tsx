import { forwardRef } from "react";

export const GlassWindow = forwardRef(function GlassWindow(props: {
  children?: React.ReactNode;
  className: string;
}, ref) {
  return (
    <div
      className={`bg-white bg-opacity-75 p-2 shadow-xl rounded-2xl ${props.className}`}
      ref={ref}
    >
      <div className="bg-white border-gray-300 border rounded-2xl h-full w-full">
        {props.children}
      </div>
    </div>
  );
});

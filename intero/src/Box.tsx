import * as React from "react";
import { useEffect } from "react";


export const SearchInput = React.forwardRef((props: React.InputHTMLAttributes<HTMLInputElement>, ref: React.Ref<HTMLInputElement>) => {
    return (
        <input
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            className="flex-1 bg-white border border-gray-300 rounded-xl shadow-sm p-2 block w-full min-w-full sm:text-lg basis-full"
            ref={ref}
            {...props}
            />
    );
});

export const SearchContainer = React.forwardRef((props: { children: React.ReactNode}, ref: React.Ref<HTMLDivElement>) => {
    return (
        <div
          className="flex flex-col mt-2 w-80 items-stretch justify-stretch shadow-xl rounded-xl bg-white bg-opacity-75 border border-gray-300 p-2 space-y-2"
          ref={ref}
        >{props.children}</div>
    );
});

export function MatchContainer(props: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col bg-white bg-opacity-75 border-gray-300 rounded-md shadow-sm py-2 w-full sm:text-sm items-stretch justify-stretch space-y-2">
      {props.children}
    </div>
  );
}

export function MatchResult(props: { children: React.ReactNode, onClick?: () => void, selected?: boolean }) {
  let className =
    "p-2 select-none cursor-pointer text-sm text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 hover:text-gray-500 white-space-nowrap overflow-ellipsis min-w-0 w-full basis-full rounded-xl";
  if (props.selected) {
    className += " text-pink-500 hover:text-pink-600";
  }
    return (
        <a
        className={className}
        onClick={props.onClick}
        >
            {props.children}
        </a>
    );
}


export function onMouseDownOutside(
  containerRef: React.RefObject<HTMLElement>,
  callback: () => void
) {
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as any)) {
        return;
      }
      callback();
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("click", handleMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("click", handleMouseDown);
    };
  }, [containerRef, callback]);
}
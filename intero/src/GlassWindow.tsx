export function GlassWindow(props: {
  children?: React.ReactNode;
  className: string;
}) {
  return (
    <div
      className={`bg-white bg-opacity-75 p-2 shadow-xl rounded-2xl ${props.className}`}
    >
      <div className="bg-white border-gray-300 border rounded-2xl h-full w-full">
        {props.children}
      </div>
    </div>
  );
}

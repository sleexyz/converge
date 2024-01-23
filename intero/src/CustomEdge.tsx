import { BaseEdge, EdgeProps, getBezierPath, getStraightPath } from 'reactflow';
 
export default function CustomEdge({ id, sourceX, sourceY, targetX, targetY }: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });
 
  return (
    <>
      <BaseEdge id={id} path={edgePath} />
    </>
  );
}
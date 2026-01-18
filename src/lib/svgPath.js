export function pointsToPath(points, closed = false) {
  if (!points.length) return "";
  const [p0, ...rest] = points;
  let d = `M ${p0.x} ${p0.y}`;
  for (const p of rest) d += ` L ${p.x} ${p.y}`;
  if (closed) d += " Z";
  return d;
}

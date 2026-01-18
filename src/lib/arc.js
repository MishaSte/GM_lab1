const DEG2RAD = Math.PI / 180;

export function arcPoints(center, r, degStart, degEnd, stepDeg = 1) {
  let a0 = degStart;
  let a1 = degEnd;

  if (a1 < a0) a1 += 360;

  const pts = [];
  for (let a = a0; a <= a1 + 1e-9; a += stepDeg) {
    const gamma = a * DEG2RAD;
    const x = r * Math.cos(gamma) + center.x;
    const y = r * Math.sin(gamma) + center.y;
    pts.push({ x, y });
  }
  return pts;
}

export function circlePoints(center, r, stepDeg = 1) {
  return arcPoints(center, r, 0, 360, stepDeg);
}

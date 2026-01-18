import { arcPoints, circlePoints } from "./arc";

export const DEFAULT_PARAMS = {
  holeR: 1.0,
  uR: 1.8724,
  notchY: -2.6221,
  notchInnerX: 1.2402,
  notchBottomY: -3.7984,
  notchOuterX: 2.4033,
  outerP1x: 1.2431,
  outerP1y: 3.1352,
  outerP2x: 3.0759,
  outerP2y: -0.5836,
  outerP3x: 3.0759,
  outerP3y: -1.8701,
  filletR: 3.1001,
  topBulge: 0.0,
};

const ARC_STEP_DEG = 2;

const pt = (x, y) => ({ x, y });
const mirrorY = (p) => pt(-p.x, p.y);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const toDeg = (rad) => (rad * 180) / Math.PI;

function twoCircleCenters(A, B, R) {
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const d = Math.hypot(dx, dy);

  if (d < 1e-9) {
    const r = Math.max(R, 1e-6);
    return [
      { x: A.x - r, y: A.y },
      { x: A.x + r, y: A.y },
    ];
  }

  const r = Math.max(R, d / 2 + 1e-6);

  const mx = (A.x + B.x) / 2;
  const my = (A.y + B.y) / 2;

  const h = Math.sqrt(Math.max(0, r * r - (d * d) / 4));

  const ux = -dy / d;
  const uy = dx / d;

  const c1 = { x: mx + ux * h, y: my + uy * h };
  const c2 = { x: mx - ux * h, y: my - uy * h };
  return [c1, c2];
}

function pointOnCircle(C, R, deg) {
  const a = (deg * Math.PI) / 180;
  return { x: C.x + R * Math.cos(a), y: C.y + R * Math.sin(a) };
}

function buildRightBottomFilletArc(E, P3, R) {
  const dx = P3.x - E.x;
  const dy = P3.y - E.y;
  const d = Math.hypot(dx, dy);

  const r = Math.max(R, d / 2 + 1e-6);
  const [c1, c2] = twoCircleCenters(E, P3, r);

  const minX = Math.min(E.x, P3.x);
  const minY = Math.min(E.y, P3.y);

  function score(center) {
    let a0 = toDeg(Math.atan2(E.y - center.y, E.x - center.x));
    let a1 = toDeg(Math.atan2(P3.y - center.y, P3.x - center.x));

    let end = a1;
    if (end < a0) end += 360;
    const mid = (a0 + end) / 2;

    const pm = pointOnCircle(center, r, mid);

    const leftBonus = center.x < minX ? 0 : 1000;
    const upPenalty = pm.y > minY ? 500 : 0;

    return leftBonus + upPenalty + pm.y * 10;
  }

  const s1 = score(c1);
  const s2 = score(c2);
  const center = s1 <= s2 ? c1 : c2;

  const aStart = toDeg(Math.atan2(E.y - center.y, E.x - center.x));
  const aEnd = toDeg(Math.atan2(P3.y - center.y, P3.x - center.x));

  const pts = arcPoints(center, r, aStart, aEnd, ARC_STEP_DEG);
  pts[0] = E;
  pts[pts.length - 1] = P3;
  return pts;
}
function arcByChordSagitta(A, B, s) {
  const sag = Number(s) || 0;
  if (Math.abs(sag) < 1e-6) return null;

  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const c = Math.hypot(dx, dy);
  if (c < 1e-9) return null;

  const sClamped = clamp(sag, -0.45 * c, 0.45 * c);

  const sAbs = Math.abs(sClamped);
  const R = (c * c) / (8 * sAbs) + sAbs / 2;

  const mx = (A.x + B.x) / 2;
  const my = (A.y + B.y) / 2;

  const px = -dy / c;
  const py = dx / c;

  const h = R - sAbs;

  const sign = sClamped > 0 ? 1 : -1;
  const C = { x: mx + px * h * sign, y: my + py * h * sign };

  const aA = toDeg(Math.atan2(A.y - C.y, A.x - C.x));
  const aB = toDeg(Math.atan2(B.y - C.y, B.x - C.x));

  let dCCW = (((aB - aA) % 360) + 360) % 360;
  let dCW = 360 - dCCW;
  const useCCW = dCCW <= dCW;

  let end = aB;
  if (useCCW) {
    if (end < aA) end += 360;
  } else {
    const pts = arcPoints(C, R, aB, aA, ARC_STEP_DEG);
    pts[0] = B;
    pts[pts.length - 1] = A;
    pts.reverse();
    return pts;
  }

  const pts = arcPoints(C, R, aA, end, ARC_STEP_DEG);
  pts[0] = A;
  pts[pts.length - 1] = B;
  return pts;
}

export function buildModel(params = {}) {
  const p = { ...DEFAULT_PARAMS, ...params };

  const notchY = Math.max(p.notchY, -7.0);

  const uR = Math.max(0.0001, p.uR);
  const holeR = clamp(p.holeR, 0.0001, uR - 0.0001);

  const notchInnerX = clamp(p.notchInnerX, 0.0001, uR - 0.0001);
  const notchOuterX = Math.max(p.notchOuterX, notchInnerX + 0.0001);
  const notchBottomY = Math.min(p.notchBottomY, notchY - 0.0001);

  // опорні точки внутрішнього вирізу права
  const A = pt(uR, 0);
  const B = pt(uR, notchY);
  const C = pt(notchInnerX, notchY);
  const D = pt(notchInnerX, notchBottomY);
  const E = pt(notchOuterX, notchBottomY);

  // зовнішній контур права
  const P1 = pt(p.outerP1x, p.outerP1y);
  const P2 = pt(p.outerP2x, p.outerP2y);
  const P3 = pt(p.outerP3x, p.outerP3y);

  const P1L = mirrorY(P1);
  const P2L = mirrorY(P2);
  const P3L = mirrorY(P3);

  // нижня дуга права/ліва
  const filletPtsR = buildRightBottomFilletArc(
    E,
    P3,
    Math.max(0.0001, p.filletR),
  );
  const filletPtsL = filletPtsR.map(mirrorY);

  const topArc = arcByChordSagitta(P1L, P1, p.topBulge);

  const paths = [];

  paths.push({
    name: "hole",
    closed: true,
    pts: circlePoints({ x: 0, y: 0 }, holeR, ARC_STEP_DEG),
  });

  paths.push({
    name: "uArc",
    closed: false,
    pts: arcPoints({ x: 0, y: 0 }, uR, 180, 360, ARC_STEP_DEG),
  });

  paths.push({ name: "notchR", closed: false, pts: [A, B, C, D, E] });
  paths.push({
    name: "notchL",
    closed: false,
    pts: [A, B, C, D, E].map(mirrorY),
  });

  paths.push({ name: "outerR", closed: false, pts: [P1, P2, P3] });
  paths.push({ name: "outerL", closed: false, pts: [P1L, P2L, P3L] });

  if (topArc) {
    paths.push({ name: "outerTopArc", closed: false, pts: topArc });
  } else {
    paths.push({ name: "outerTop", closed: false, pts: [P1L, P1] });
  }

  paths.push({ name: "filletArcR", closed: false, pts: filletPtsR });
  paths.push({ name: "filletArcL", closed: false, pts: filletPtsL });

  return paths;
}

export function matMul(A, B) {
  const C = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      C[r][c] = A[r][0] * B[0][c] + A[r][1] * B[1][c] + A[r][2] * B[2][c];
    }
  }
  return C;
}

export function matDet3(M) {
  const a = M[0][0],
    b = M[0][1],
    c = M[0][2];
  const d = M[1][0],
    e = M[1][1],
    f = M[1][2];
  const g = M[2][0],
    h = M[2][1],
    i = M[2][2];
  return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
}

export function matInv3(M) {
  const det = matDet3(M);
  if (Math.abs(det) < 1e-12) return null;

  const a = M[0][0],
    b = M[0][1],
    c = M[0][2];
  const d = M[1][0],
    e = M[1][1],
    f = M[1][2];
  const g = M[2][0],
    h = M[2][1],
    i = M[2][2];

  const A00 = e * i - f * h;
  const A01 = -(b * i - c * h);
  const A02 = b * f - c * e;

  const A10 = -(d * i - f * g);
  const A11 = a * i - c * g;
  const A12 = -(a * f - c * d);

  const A20 = d * h - e * g;
  const A21 = -(a * h - b * g);
  const A22 = a * e - b * d;

  const invDet = 1 / det;
  return [
    [A00 * invDet, A01 * invDet, A02 * invDet],
    [A10 * invDet, A11 * invDet, A12 * invDet],
    [A20 * invDet, A21 * invDet, A22 * invDet],
  ];
}

export function applyMatToPoint(p, M) {
  const x = p.x;
  const y = p.y;

  const xp = x * M[0][0] + y * M[1][0] + 1 * M[2][0];
  const yp = x * M[0][1] + y * M[1][1] + 1 * M[2][1];
  const wp = x * M[0][2] + y * M[1][2] + 1 * M[2][2];

  const eps = 1e-9;
  const w = Math.abs(wp) < eps ? (wp < 0 ? -eps : eps) : wp;
  return { x: xp / w, y: yp / w };
}

export function matTranslate(dx, dy) {
  return [
    [1, 0, 0],
    [0, 1, 0],
    [dx, dy, 1],
  ];
}

export function matRotateAround(px, py, angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);

  return [
    [c, s, 0],
    [-s, c, 0],
    [-px * (c - 1) + py * s, -px * s - py * (c - 1), 1],
  ];
}

export function matScaleAround(px, py, s) {
  const T1 = matTranslate(px, py);
  const S = [
    [s, 0, 0],
    [0, s, 0],
    [0, 0, 1],
  ];
  const T2 = matTranslate(-px, -py);
  return matMul(matMul(T1, S), T2);
}

export function matAffine(Xx, Xy, Yx, Yy, Ox, Oy) {
  return [
    [Xx, Xy, 0],
    [Yx, Yy, 0],
    [Ox, Oy, 1],
  ];
}

export function matProjective(Xend, Yend, O, wx, wy, w0) {
  return [
    [Xend.x * wx, Xend.y * wx, wx],
    [Yend.x * wy, Yend.y * wy, wy],
    [O.x * w0, O.y * w0, w0],
  ];
}

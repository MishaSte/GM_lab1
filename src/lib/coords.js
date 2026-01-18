export function worldToScreen({ x, y }, { ox, oy, pxPerUnit }) {
  return {
    x: ox + x * pxPerUnit,
    y: oy - y * pxPerUnit,
  };
}

export function screenToWorld({ x, y }, { ox, oy, pxPerUnit }) {
  return {
    x: (x - ox) / pxPerUnit,
    y: (oy - y) / pxPerUnit,
  };
}

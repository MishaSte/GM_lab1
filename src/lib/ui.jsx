export function GridAxes({ w2s, gridNum }) {
  const lines = [];

  for (let i = -gridNum; i <= gridNum; i++) {
    const p1 = w2s({ x: i, y: -gridNum });
    const p2 = w2s({ x: i, y: gridNum });
    lines.push(
      <line
        key={`gv-${i}`}
        className="grid-line"
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
      />,
    );
  }

  for (let i = -gridNum; i <= gridNum; i++) {
    const p1 = w2s({ x: -gridNum, y: i });
    const p2 = w2s({ x: gridNum, y: i });
    lines.push(
      <line
        key={`gh-${i}`}
        className="grid-line"
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
      />,
    );
  }

  const O = w2s({ x: 0, y: 0 });
  const P1 = w2s({ x: 1, y: 0 });
  const P2 = w2s({ x: 0, y: 1 });

  const xAxisA = w2s({ x: -gridNum, y: 0 });
  const xAxisB = w2s({ x: gridNum, y: 0 });
  const yAxisA = w2s({ x: 0, y: -gridNum });
  const yAxisB = w2s({ x: 0, y: gridNum });

  return (
    <g>
      {lines}

      <line
        className="axis-line"
        x1={xAxisA.x}
        y1={xAxisA.y}
        x2={xAxisB.x}
        y2={xAxisB.y}
      />
      <line
        className="axis-line"
        x1={yAxisA.x}
        y1={yAxisA.y}
        x2={yAxisB.x}
        y2={yAxisB.y}
      />

      <circle className="axis-point" cx={O.x} cy={O.y} r={4} />
      <circle className="axis-point" cx={P1.x} cy={P1.y} r={4} />
      <circle className="axis-point" cx={P2.x} cy={P2.y} r={4} />

      <text className="axis-text" x={O.x + 6} y={O.y - 6}>
        (0,0)
      </text>
      <text className="axis-text" x={P1.x + 6} y={P1.y - 6}>
        P1
      </text>
      <text className="axis-text" x={P2.x + 6} y={P2.y - 6}>
        P2
      </text>
    </g>
  );
}

export function getSvgPoint(evt, svgEl) {
  const rect = svgEl.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;

  const vb = svgEl.viewBox.baseVal;
  const sx = vb.width / rect.width;
  const sy = vb.height / rect.height;

  return { x: vb.x + x * sx, y: vb.y + y * sy };
}

export function SliderField({ label, value, min, max, step, onChange }) {
  const v = Number.isFinite(value) ? value : 0;
  return (
    <div className="slider">
      <div className="slider-header">
        <div className="slider-label">{label}</div>
        <div className="slider-value">{v.toFixed(4)}</div>
      </div>

      <input
        className="slider-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => onChange(Number(e.target.value))}
      />

      <input
        className="slider-input"
        type="number"
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

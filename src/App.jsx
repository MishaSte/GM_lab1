import { useMemo, useRef, useState } from "react";
import "./App.css";

import { buildModel, DEFAULT_PARAMS } from "./lib/model";
import { worldToScreen, screenToWorld } from "./lib/coords";
import { pointsToPath } from "./lib/svgPath";

import {
  applyMatToPoint,
  matAffine,
  matInv3,
  matMul,
  matProjective,
  matRotateAround,
  matScaleAround,
  matTranslate,
} from "./lib/matrix3";

import { GridAxes, getSvgPoint, SliderField } from "./lib/ui";

export default function App() {
  const w = 1370;
  const h = 750;

  const P0 = { x: 160, y: h - 140 };
  const [pxPerCm, setPxPerCm] = useState(35);
  const gridNum = 20;

  // модель (позиція, поворот, pivot, масштаб)
  const [modelPos, setModelPos] = useState({ x: 6, y: 4 });
  const [angleDeg, setAngleDeg] = useState(0);
  const [pivotWorld, setPivotWorld] = useState({ x: 6, y: 4 });
  const [specialOn, setSpecialOn] = useState(false);
  const [scaleK, setScaleK] = useState(1);

  // режими координат
  const [affineOn, setAffineOn] = useState(false);
  const [aff, setAff] = useState({
    Xx: 1,
    Xy: 0,
    Yx: 0,
    Yy: 1,
    Ox: 0,
    Oy: 0,
  });

  const [projOn, setProjOn] = useState(false);
  const [proj, setProj] = useState({
    XendX: 20,
    XendY: 0,
    YendX: 0,
    YendY: 20,
    Ox: 0,
    Oy: 0,
    wx: 0.015,
    wy: 0.015,
    w0: 1.0,
  });

  // параметри фігури
  const [modelParams, setModelParams] = useState({
    holeR: DEFAULT_PARAMS.holeR,
    uR: DEFAULT_PARAMS.uR,

    notchY: DEFAULT_PARAMS.notchY,
    notchInnerX: DEFAULT_PARAMS.notchInnerX,
    notchBottomY: DEFAULT_PARAMS.notchBottomY,
    notchOuterX: DEFAULT_PARAMS.notchOuterX,

    outerP1x: DEFAULT_PARAMS.outerP1x,
    outerP1y: DEFAULT_PARAMS.outerP1y,
    outerP2x: DEFAULT_PARAMS.outerP2x,
    outerP2y: DEFAULT_PARAMS.outerP2y,
    outerP3x: DEFAULT_PARAMS.outerP3x,
    outerP3y: DEFAULT_PARAMS.outerP3y,

    filletR: DEFAULT_PARAMS.filletR,
    topBulge: DEFAULT_PARAMS.topBulge ?? 0,
  });

  // drag
  const [dragging, setDragging] = useState(false);
  const dragModeRef = useRef("none");
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const svgRef = useRef(null);

  const localModelPaths = useMemo(() => buildModel(modelParams), [modelParams]);

  // affine/projective матриця
  const sceneM = useMemo(() => {
    if (projOn) {
      const Xend = { x: proj.XendX, y: proj.XendY };
      const Yend = { x: proj.YendX, y: proj.YendY };
      const O = { x: proj.Ox, y: proj.Oy };
      return matProjective(Xend, Yend, O, proj.wx, proj.wy, proj.w0);
    }
    if (affineOn) {
      return matAffine(aff.Xx, aff.Xy, aff.Yx, aff.Yy, aff.Ox, aff.Oy);
    }
    return null;
  }, [
    projOn,
    proj.XendX,
    proj.XendY,
    proj.YendX,
    proj.YendY,
    proj.Ox,
    proj.Oy,
    proj.wx,
    proj.wy,
    proj.w0,
    affineOn,
    aff.Xx,
    aff.Xy,
    aff.Yx,
    aff.Yy,
    aff.Ox,
    aff.Oy,
  ]);

  const sceneInv = useMemo(() => {
    if (!sceneM) return null;
    return matInv3(sceneM);
  }, [sceneM]);

  const worldToWorld2 = useMemo(() => {
    if (!sceneM) return (p) => p;
    return (p) => applyMatToPoint(p, sceneM);
  }, [sceneM]);

  const world2ToWorld = useMemo(() => {
    if (!sceneInv) return (p) => p;
    return (p) => applyMatToPoint(p, sceneInv);
  }, [sceneInv]);

  // world -> screen
  const w2s = useMemo(() => {
    const ox = P0.x;
    const oy = P0.y;
    return (pWorld) => {
      const pW2 = worldToWorld2(pWorld);
      return worldToScreen(pW2, { ox, oy, pxPerUnit: pxPerCm });
    };
  }, [P0.x, P0.y, pxPerCm, worldToWorld2]);

  const pivotScreen = useMemo(
    () => w2s(pivotWorld),
    [w2s, pivotWorld.x, pivotWorld.y],
  );

  // transform моделі
  const modelWorldTransform = useMemo(() => {
    const T = matTranslate(modelPos.x, modelPos.y);
    let M = T;

    if (specialOn) {
      const eps = 1e-4;
      const s = Math.max(eps, scaleK);
      const S = matScaleAround(pivotWorld.x, pivotWorld.y, s);
      M = matMul(M, S);
    }

    const R = matRotateAround(pivotWorld.x, pivotWorld.y, angleDeg);
    M = matMul(M, R);

    return M;
  }, [
    modelPos.x,
    modelPos.y,
    pivotWorld.x,
    pivotWorld.y,
    angleDeg,
    specialOn,
    scaleK,
  ]);

  const renderPaths = useMemo(() => {
    return localModelPaths.map((path) => {
      const ptsWorld = path.pts.map((p) =>
        applyMatToPoint(p, modelWorldTransform),
      );
      const ptsScreen = ptsWorld.map((p) => w2s(p));
      return { name: path.name, d: pointsToPath(ptsScreen, !!path.closed) };
    });
  }, [localModelPaths, modelWorldTransform, w2s]);

  const screenEventToWorld = (e) => {
    const svgEl = svgRef.current;
    const pSvg = getSvgPoint(e, svgEl);

    const cursorWorld2 = screenToWorld(pSvg, {
      ox: P0.x,
      oy: P0.y,
      pxPerUnit: pxPerCm,
    });

    return world2ToWorld(cursorWorld2);
  };

  const onPivotPointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const cursorWorld = screenEventToWorld(e);

    dragOffsetRef.current = {
      x: cursorWorld.x - pivotWorld.x,
      y: cursorWorld.y - pivotWorld.y,
    };

    dragModeRef.current = "pivot";
    setDragging(true);
  };

  const onModelPointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const cursorWorld = screenEventToWorld(e);

    dragOffsetRef.current = {
      x: cursorWorld.x - modelPos.x,
      y: cursorWorld.y - modelPos.y,
    };

    dragModeRef.current = "model";
    setDragging(true);
  };

  const onSvgPointerMove = (e) => {
    if (!dragging) return;

    const cursorWorld = screenEventToWorld(e);
    const off = dragOffsetRef.current;

    if (dragModeRef.current === "pivot") {
      setPivotWorld({
        x: cursorWorld.x - off.x,
        y: cursorWorld.y - off.y,
      });
      return;
    }

    if (dragModeRef.current === "model") {
      const newPos = {
        x: cursorWorld.x - off.x,
        y: cursorWorld.y - off.y,
      };

      setModelPos(newPos);
    }
  };

  const onSvgPointerUp = () => {
    setDragging(false);
    dragModeRef.current = "none";
  };

  const setP = (key, v) => setModelParams((s) => ({ ...s, [key]: v }));
  const setA = (key, v) => setAff((s) => ({ ...s, [key]: v }));
  const setProjState = (key, v) => setProj((s) => ({ ...s, [key]: v }));

  return (
    <div className="app">
      <div className="canvas">
        <svg
          ref={svgRef}
          className="svg-root"
          viewBox={`0 0 ${w} ${h}`}
          onPointerMove={onSvgPointerMove}
          onPointerUp={onSvgPointerUp}
          onPointerLeave={onSvgPointerUp}
        >
          <GridAxes w2s={w2s} gridNum={gridNum} />

          <circle
            className="pivot"
            cx={pivotScreen.x}
            cy={pivotScreen.y}
            r={5}
            onPointerDown={onPivotPointerDown}
            style={{ cursor: "move" }}
          />

          <g
            onPointerDown={onModelPointerDown}
            className={`model-layer ${dragging ? "dragging" : ""}`}
          >
            {renderPaths.map((p) => (
              <path key={p.name} d={p.d} className="model-path" />
            ))}
          </g>
        </svg>
      </div>

      <div className="sidebar">
        <div style={{ marginBottom: 6 }}>Density: {pxPerCm}</div>
        <input
          className="slider-range"
          type="range"
          min={10}
          max={120}
          step={1}
          value={pxPerCm}
          onChange={(e) => setPxPerCm(Number(e.target.value))}
        />

        <hr className="hr" />

        <h3 className="section-title">Euclidean</h3>

        <SliderField
          label="Angle"
          value={angleDeg}
          min={-720}
          max={720}
          step={1}
          onChange={(v) => setAngleDeg(v)}
        />

        <hr className="hr" />

        <h3 className="section-title">Scaling</h3>

        <label
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <input
            type="checkbox"
            checked={specialOn}
            onChange={(e) => {
              const on = e.target.checked;
              setSpecialOn(on);
              if (!on) setScaleK(1);
            }}
          />
          Enable scaling around pivot
        </label>

        {specialOn && (
          <SliderField
            label="Scale"
            value={scaleK}
            min={0.1}
            max={5.0}
            step={0.01}
            onChange={(v) => setScaleK(v)}
          />
        )}

        <hr className="hr" />

        <h3 className="section-title">Affine</h3>

        <label
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <input
            type="checkbox"
            checked={affineOn}
            onChange={(e) => {
              const on = e.target.checked;
              setAffineOn(on);
              if (on) setProjOn(false);
            }}
          />
          Enable affine CS
        </label>

        {affineOn && !projOn && (
          <>
            <SliderField
              label="Xx"
              value={aff.Xx}
              min={-3}
              max={3}
              step={0.01}
              onChange={(v) => setA("Xx", v)}
            />
            <SliderField
              label="Xy"
              value={aff.Xy}
              min={-3}
              max={3}
              step={0.01}
              onChange={(v) => setA("Xy", v)}
            />
            <SliderField
              label="Yx"
              value={aff.Yx}
              min={-3}
              max={3}
              step={0.01}
              onChange={(v) => setA("Yx", v)}
            />
            <SliderField
              label="Yy"
              value={aff.Yy}
              min={-3}
              max={3}
              step={0.01}
              onChange={(v) => setA("Yy", v)}
            />
            <SliderField
              label="Ox"
              value={aff.Ox}
              min={-10}
              max={10}
              step={0.01}
              onChange={(v) => setA("Ox", v)}
            />
            <SliderField
              label="Oy"
              value={aff.Oy}
              min={-10}
              max={10}
              step={0.01}
              onChange={(v) => setA("Oy", v)}
            />
          </>
        )}

        <hr className="hr" />

        <h3 className="section-title">Projective</h3>

        <label
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <input
            type="checkbox"
            checked={projOn}
            onChange={(e) => {
              const on = e.target.checked;
              setProjOn(on);
              if (on) setAffineOn(false);
            }}
          />
          Enable projective CS
        </label>

        {projOn && (
          <>
            <SliderField
              label="wx"
              value={proj.wx}
              min={-0.5}
              max={0.5}
              step={0.001}
              onChange={(v) => setProjState("wx", v)}
            />
            <SliderField
              label="wy"
              value={proj.wy}
              min={-0.5}
              max={0.5}
              step={0.001}
              onChange={(v) => setProjState("wy", v)}
            />
            <SliderField
              label="w0"
              value={proj.w0}
              min={0.1}
              max={3.0}
              step={0.01}
              onChange={(v) => setProjState("w0", v)}
            />

            <SliderField
              label="XendX"
              value={proj.XendX}
              min={-20}
              max={20}
              step={0.1}
              onChange={(v) => setProjState("XendX", v)}
            />
            <SliderField
              label="XendY"
              value={proj.XendY}
              min={-20}
              max={20}
              step={0.1}
              onChange={(v) => setProjState("XendY", v)}
            />
            <SliderField
              label="YendX"
              value={proj.YendX}
              min={-20}
              max={20}
              step={0.1}
              onChange={(v) => setProjState("YendX", v)}
            />
            <SliderField
              label="YendY"
              value={proj.YendY}
              min={-20}
              max={20}
              step={0.1}
              onChange={(v) => setProjState("YendY", v)}
            />

            <SliderField
              label="Ox"
              value={proj.Ox}
              min={-10}
              max={10}
              step={0.1}
              onChange={(v) => setProjState("Ox", v)}
            />
            <SliderField
              label="Oy"
              value={proj.Oy}
              min={-10}
              max={10}
              step={0.1}
              onChange={(v) => setProjState("Oy", v)}
            />
          </>
        )}

        <hr className="hr" />

        <h3 className="section-title">Model params</h3>

        <SliderField
          label="holeR"
          value={modelParams.holeR}
          min={0.2}
          max={2.5}
          step={0.01}
          onChange={(v) => setP("holeR", v)}
        />

        <SliderField
          label="uR"
          value={modelParams.uR}
          min={0.5}
          max={4}
          step={0.01}
          onChange={(v) => setP("uR", v)}
        />

        <SliderField
          label="notchY"
          value={modelParams.notchY}
          min={-10}
          max={-1}
          step={0.01}
          onChange={(v) => setP("notchY", v)}
        />

        <SliderField
          label="notchInnerX"
          value={modelParams.notchInnerX}
          min={0.2}
          max={3}
          step={0.01}
          onChange={(v) => setP("notchInnerX", v)}
        />

        <SliderField
          label="notchBottomY"
          value={modelParams.notchBottomY}
          min={-12}
          max={-2}
          step={0.01}
          onChange={(v) => setP("notchBottomY", v)}
        />

        <SliderField
          label="notchOuterX"
          value={modelParams.notchOuterX}
          min={0.5}
          max={5}
          step={0.01}
          onChange={(v) => setP("notchOuterX", v)}
        />

        <hr />

        <SliderField
          label="topBulge"
          value={modelParams.topBulge}
          min={-5}
          max={5}
          step={0.01}
          onChange={(v) => setP("topBulge", v)}
        />

        <SliderField
          label="outerP1x"
          value={modelParams.outerP1x}
          min={0.5}
          max={5}
          step={0.01}
          onChange={(v) => setP("outerP1x", v)}
        />

        <SliderField
          label="outerP1y"
          value={modelParams.outerP1y}
          min={1}
          max={6}
          step={0.01}
          onChange={(v) => setP("outerP1y", v)}
        />

        <SliderField
          label="outerP2x"
          value={modelParams.outerP2x}
          min={1}
          max={6}
          step={0.01}
          onChange={(v) => setP("outerP2x", v)}
        />

        <SliderField
          label="outerP2y"
          value={modelParams.outerP2y}
          min={-5}
          max={2}
          step={0.01}
          onChange={(v) => setP("outerP2y", v)}
        />

        <SliderField
          label="outerP3x"
          value={modelParams.outerP3x}
          min={1}
          max={6}
          step={0.01}
          onChange={(v) => setP("outerP3x", v)}
        />

        <SliderField
          label="outerP3y"
          value={modelParams.outerP3y}
          min={-5}
          max={2}
          step={0.01}
          onChange={(v) => setP("outerP3y", v)}
        />

        <button
          className="btn"
          onClick={() => {
            setAngleDeg(0);
            setPivotWorld({ x: modelPos.x, y: modelPos.y });

            setSpecialOn(false);
            setScaleK(1);

            setAffineOn(false);
            setProjOn(false);
            setAff({ Xx: 1, Xy: 0, Yx: 0, Yy: 1, Ox: 0, Oy: 0 });

            setProj({
              XendX: 20,
              XendY: 0,
              YendX: 0,
              YendY: 20,
              Ox: 0,
              Oy: 0,
              wx: 0.015,
              wy: 0.015,
              w0: 1.0,
            });

            setModelParams({
              holeR: DEFAULT_PARAMS.holeR,
              uR: DEFAULT_PARAMS.uR,
              notchY: DEFAULT_PARAMS.notchY,
              notchInnerX: DEFAULT_PARAMS.notchInnerX,
              notchBottomY: DEFAULT_PARAMS.notchBottomY,
              notchOuterX: DEFAULT_PARAMS.notchOuterX,
              outerP1x: DEFAULT_PARAMS.outerP1x,
              outerP1y: DEFAULT_PARAMS.outerP1y,
              outerP2x: DEFAULT_PARAMS.outerP2x,
              outerP2y: DEFAULT_PARAMS.outerP2y,
              outerP3x: DEFAULT_PARAMS.outerP3x,
              outerP3y: DEFAULT_PARAMS.outerP3y,
              filletR: DEFAULT_PARAMS.filletR,
              topBulge: DEFAULT_PARAMS.topBulge ?? 0,
            });
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

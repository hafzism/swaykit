"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Link from "next/link";
import { fieldModes, type FieldMode } from "@/lib/form-dynamics";
import type { FormScene, FormState } from "@/lib/form-scene";

const initial: FormState = {
  mode: "wave",
  amplitude: 0.72,
  rate: 0.45,
  held: false,
  action: "Brush the surface. Feel the response.",
};

export default function FormInstrument() {
  const canvas = useRef<HTMLCanvasElement>(null),
    runtime = useRef<FormScene | null>(null);
  const [status, setStatus] = useState("loading"),
    [state, setState] = useState(initial),
    [controls, setControls] = useState(false);
  useEffect(() => {
    const element = canvas.current!;
    let disposed = false,
      started = false,
      visible = false;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !started) {
          started = true;
          try {
            const { createFormScene } = await import("@/lib/form-scene");
            if (disposed) return;
            const scene = await createFormScene(element, (value) => {
              if (!disposed) setState(value);
            });
            if (disposed) {
              scene.dispose();
              return;
            }
            runtime.current = scene;
            setStatus("ready");
          } catch (error) {
            console.error("FORM instrument unavailable", error);
            if (!disposed) setStatus("fallback");
          }
        }
        runtime.current?.setActive(visible && !document.hidden);
      },
      { threshold: 0.03 },
    );
    observer.observe(element.closest("section")!);
    const resize = new ResizeObserver(() => runtime.current?.resize());
    resize.observe(element);
    const visibility = () =>
      runtime.current?.setActive(visible && !document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      observer.disconnect();
      resize.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      runtime.current?.dispose();
      runtime.current = null;
    };
  }, []);
  return (
    <section
      id="form-instrument"
      className={`form-instrument is-${status}`}
      aria-labelledby="form-title"
    >
      <div className="form-top">
        <span className="eyebrow">
          <span className="status-dot" />
          05 / THE FEELING MACHINE
        </span>
        <Link href="/components/">
          Explore components <ArrowUpRight size={17} />
        </Link>
      </div>
      <div className="form-heading">
        <h2 id="form-title">
          Digital.
          <br />
          <em>But you can feel it.</em>
        </h2>
        <p>
          A little curiosity.
          <br /> A whole new response.
        </p>
      </div>
      <div className="form-stage">
        <span className="form-backtype" aria-hidden="true">
          FORM
        </span>
        <div className="form-loading" aria-hidden="true">
          <span />
          {status === "fallback"
            ? "This instrument needs WebGL."
            : "ASSEMBLING 768 MOVING PARTS"}
        </div>
        <canvas
          ref={canvas}
          tabIndex={status === "ready" ? 0 : -1}
          role="img"
          aria-label="Interactive FORM instrument. Brush or press the pins. Drag the frequency dial or height fader. Press the three mode keys, impulse button, or hold switch. Drag the case to tilt. Keyboard: 1, 2, 3 select modes; arrows adjust height and frequency; Space sends a pulse; H holds; R resets."
        />
        <div className="form-object-caption mono" aria-hidden="true">
          <span>FORM—001</span>
          <span>TACTILE EXPLORATION</span>
        </div>
        <span className="form-touch-hint">
          Touch & hold to sculpt. Drag to explore.
        </span>
      </div>
      <div className="form-bottom">
        <div className="form-feedback">
          <span className="form-feedback-dot" />
          <span aria-live="polite">
            {status === "loading"
              ? "Preparing your instrument…"
              : status === "fallback"
                ? "Try a browser with WebGL enabled."
                : state.action}
          </span>
        </div>
        <div className="form-actions">
          <button
            aria-label="Reset FORM instrument"
            disabled={status !== "ready"}
            onClick={() => runtime.current?.reset()}
          >
            <RotateCcw size={16} />
          </button>
          <button
            aria-expanded={controls}
            aria-controls="form-controls"
            onClick={() => setControls(!controls)}
          >
            <SlidersHorizontal size={15} />
            Controls
          </button>
          <a href="#collection" aria-label="Continue to the collection">
            <ArrowDown size={18} />
          </a>
        </div>
      </div>
      {controls && (
        <div
          className="form-controls"
          id="form-controls"
          role="group"
          aria-label="FORM instrument controls"
        >
          <div className="form-controls-heading">
            <span>Make yourself at home.</span>
            <button
              onClick={() => setControls(false)}
              aria-label="Close instrument controls"
            >
              <X size={18} />
            </button>
          </div>
          <div className="form-modes">
            {fieldModes.map((mode: FieldMode, i) => (
              <button
                key={mode}
                disabled={status !== "ready"}
                aria-pressed={state.mode === mode}
                onClick={() => runtime.current?.setMode(mode)}
              >
                <small>0{i + 1}</small>
                {mode}
              </button>
            ))}
          </div>
          <label>
            Height <span>{Math.round(state.amplitude * 100)}%</span>
            <input
              aria-label="Surface height"
              type="range"
              min="0"
              max="100"
              value={Math.round(state.amplitude * 100)}
              disabled={status !== "ready"}
              onChange={(e) =>
                runtime.current?.setAmplitude(Number(e.target.value) / 100)
              }
            />
          </label>
          <label>
            Frequency <span>{Math.round(state.rate * 100)}%</span>
            <input
              aria-label="Wave frequency"
              type="range"
              min="0"
              max="100"
              value={Math.round(state.rate * 100)}
              disabled={status !== "ready"}
              onChange={(e) =>
                runtime.current?.setRate(Number(e.target.value) / 100)
              }
            />
          </label>
          <div className="form-controls-footer">
            <button
              aria-pressed={state.held}
              disabled={status !== "ready"}
              onClick={() => runtime.current?.toggleHold()}
            >
              {state.held ? "Release surface" : "Hold surface"}
            </button>
            <button
              disabled={status !== "ready"}
              onClick={() => runtime.current?.pulse()}
            >
              Send a pulse ↗
            </button>
          </div>
          <p>Or play directly with the object.</p>
        </div>
      )}
    </section>
  );
}

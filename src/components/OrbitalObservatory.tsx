"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  Orbit,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { orbitalObjects } from "@/lib/orbital-data";
import type { OrbitalScene } from "@/lib/orbital-scene";

export default function OrbitalObservatory() {
  const canvas = useRef<HTMLCanvasElement>(null),
    scene = useRef<OrbitalScene | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">(
      "loading",
    ),
    [selected, setSelected] = useState(0);
  useEffect(() => {
    const element = canvas.current!;
    let stopped = false,
      started = false,
      visible = false;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !started) {
          started = true;
          try {
            const { createOrbitalScene } = await import("@/lib/orbital-scene");
            if (stopped) return;
            const created = await createOrbitalScene(element, (index) => {
              if (!stopped) setSelected(index);
            });
            if (stopped) {
              created.dispose();
              return;
            }
            scene.current = created;
            setStatus("ready");
            created.setActive(visible && !document.hidden);
          } catch (error) {
            console.error("Orbital observatory unavailable", error);
            if (!stopped) setStatus("fallback");
          }
        }
        scene.current?.setActive(visible && !document.hidden);
      },
      { threshold: 0.02 },
    );
    observer.observe(element.closest("section")!);
    const resize = new ResizeObserver(() => scene.current?.resize());
    resize.observe(element);
    const visibility = () =>
      scene.current?.setActive(visible && !document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      stopped = true;
      observer.disconnect();
      resize.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);
  return (
    <section
      id="orbital-observatory"
      className={`observatory is-${status}`}
      aria-labelledby="observatory-title"
    >
      <div className="observatory-art">
        <div className="observatory-fallback" aria-hidden="true">
          <i />
          <i />
          <i />
          <span />
        </div>
        <canvas
          ref={canvas}
          role="img"
          tabIndex={status === "ready" ? 0 : -1}
          aria-label="Interactive orbital universe. Drag to rotate, tap objects to select, tap the core to scatter. Arrow keys rotate, Enter selects the next object, Space scatters, Escape resets, plus and minus zoom."
        />
      </div>
      <div className="observatory-top">
        <span className="eyebrow">
          <span className="status-dot" />
          04 / ORBITAL OBSERVATORY
        </span>
        <Link href="/components/" className="observatory-explore">
          Explore components
          <ArrowUpRight size={17} />
        </Link>
      </div>
      <h2 id="observatory-title">
        Ideas have
        <br />
        <em>gravity.</em>
      </h2>
      <span className="observatory-wordmark" aria-hidden="true">
        SWAYKIT
      </span>
      <div className="observatory-hint mono">
        {status === "loading"
          ? "ASSEMBLING YOUR UNIVERSE"
          : status === "fallback"
            ? "A UNIVERSE OF POSSIBILITIES"
            : "DRAG THE SKY. DISCOVER AN OBJECT."}
      </div>
      <div className="observatory-bottom">
        <div className="orbital-selection" aria-live="polite">
          <span className="mono">
            {String(selected).padStart(2, "0")} / SELECTED OBJECT
          </span>
          <strong>
            {orbitalObjects[selected].name}
            <span>↗</span>
          </strong>
          <span>{orbitalObjects[selected].detail}</span>
        </div>
        <div className="orbital-controls">
          <button
            disabled={status !== "ready"}
            onClick={() =>
              scene.current?.select((selected + 1) % orbitalObjects.length)
            }
            aria-label="Select next orbital object"
          >
            <Orbit size={15} />
            Discover
          </button>
          <button
            disabled={status !== "ready"}
            onClick={() => scene.current?.pulse()}
          >
            <Sparkles size={15} />
            Scatter
          </button>
          <button
            disabled={status !== "ready"}
            className="orbital-reset"
            aria-label="Reset orbital view"
            onClick={() => scene.current?.reset()}
          >
            <RotateCcw size={16} />
          </button>
        </div>
        <a href="#form-instrument" className="concept-next">
          Next concept
          <ArrowDown size={18} />
        </a>
      </div>
    </section>
  );
}

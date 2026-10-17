"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, MoveUpRight } from "lucide-react";
import type { HeroScene } from "@/lib/hero-scene";

export default function LittleWorld() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">(
    "loading",
  );
  const [assetVisible, setAssetVisible] = useState(false);
  useEffect(() => {
    const element = canvas.current!;
    let scene: HeroScene | undefined,
      cancelled = false,
      started = false,
      visible = false;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !started) {
          started = true;
          setAssetVisible(true);
          try {
            const { createToyWorld } = await import("@/lib/toy-world-scene");
            if (cancelled) return;
            const result = await createToyWorld(element);
            if (cancelled) {
              result.dispose();
              return;
            }
            scene = result;
            setStatus("ready");
            scene.setActive(visible && !document.hidden);
          } catch (error) {
            console.error("Little World unavailable", error);
            if (!cancelled) setStatus("fallback");
          }
        }
        scene?.setActive(visible && !document.hidden);
      },
      { threshold: 0.02 },
    );
    observer.observe(element);
    const resize = new ResizeObserver(() => scene?.resize());
    resize.observe(element);
    const visibility = () => scene?.setActive(visible && !document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelled = true;
      observer.disconnect();
      resize.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      scene?.dispose();
    };
  }, []);
  return (
    <section
      id="little-world"
      className="little-world"
      aria-labelledby="world-title"
    >
      <div className="world-card">
        <div className="world-topline">
          <span className="eyebrow">
            <span className="status-dot" />
            03 / LITTLE WORLD
          </span>
          <span className="mono">A LITTLE OUT OF THE ORDINARY.</span>
        </div>
        <div className={`world-stage is-${status}`}>
          <h2 id="world-title" className="sr-only">
            SwayKit. A little world of possibility.
          </h2>
          <div className="world-fallback" aria-hidden="true">
            <span className="world-fallback-type">
              SWAY
              <br />
              KIT.
            </span>
            {["cloud", "rabbit", "cat", "robot"].map((name, i) => (
              <span
                key={name}
                className={`world-sprite sprite-${i}`}
                style={{
                  backgroundImage: assetVisible
                    ? "url(/art/toy-world.png)"
                    : undefined,
                }}
              />
            ))}
          </div>
          <canvas
            ref={canvas}
            tabIndex={status === "ready" ? 0 : -1}
            role="img"
            aria-label="Interactive SwayKit character world. Drag characters and let go. Arrow keys select a character, Enter makes it jump, and Space makes everyone jump."
          />
          <div className="world-touch-hint mono">
            <MoveUpRight size={14} />
            {status === "loading"
              ? "BRINGING THE WORLD TO LIFE"
              : status === "fallback"
                ? "A LITTLE WORLD OF POSSIBILITY"
                : "A LITTLE CURIOUS? GRAB SOMEONE."}
          </div>
          <span className="world-figure mono" aria-hidden="true">
            FIG. 003
            <br />
            BUILT FOR YOUR IMAGINATION
          </span>
        </div>
        <div className="world-bottom">
          <p>
            Small pieces.
            <br />
            <em>Big possibilities.</em>
          </p>
          <Link href="/components/" className="button button-black">
            Explore components
            <ArrowUpRight size={18} />
          </Link>
          <a href="#orbital-observatory" className="concept-next">
            Next concept
            <ArrowDown size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}

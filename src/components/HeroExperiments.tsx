"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, MoveUpRight } from "lucide-react";
import type { HeroScene } from "@/lib/hero-scene";

function Artwork({ variant }: { variant: "chrome" | "matter" }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">(
    "loading",
  );
  useEffect(() => {
    const element = canvas.current!;
    let scene: HeroScene | undefined,
      cancelled = false,
      loading = false,
      visible = false;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !loading) {
          loading = true;
          try {
            const { createHeroScene } = await import("@/lib/hero-scene");
            if (cancelled) return;
            const created = await createHeroScene(element, variant, () => {
              if (!cancelled) setStatus("ready");
            });
            if (cancelled) {
              created.dispose();
              return;
            }
            scene = created;
            scene.setActive(visible && !document.hidden);
          } catch (error) {
            console.error("Hero artwork unavailable", error);
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
  }, [variant]);
  return (
    <div className={`hero-artwork is-${status}`}>
      <div className="artwork-fallback" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <canvas
        ref={canvas}
        tabIndex={status === "ready" ? 0 : -1}
        role="img"
        aria-label={
          variant === "chrome"
            ? "Interactive chrome sculpture. Drag to turn. Arrow keys rotate."
            : "Interactive 3D pieces. Drag and release to throw. Press space or arrow keys to scatter."
        }
      />
      {status !== "ready" && (
        <span className="artwork-status mono" role="status">
          {status === "loading" ? "FORMING THE SCENE" : "A STUDY IN FORM"}
        </span>
      )}
    </div>
  );
}
export function HeroConcept({ variant }: { variant: "chrome" | "matter" }) {
  const first = variant === "chrome";
  return (
    <section
      id={first ? "chrome-study" : "kinetic-matter"}
      className={`hero-concept ${first ? "concept-chrome" : "concept-matter"}`}
      aria-labelledby={`${variant}-title`}
    >
      <div className="concept-topline">
        <span className="eyebrow">
          <span className="status-dot" />{" "}
          {first ? "01 / CHROME STUDY" : "02 / KINETIC MATTER"}
        </span>
        <span className="mono">
          {first ? "FORM × FEELING" : "PLAY × POSSIBILITY"}
        </span>
      </div>
      <div className="concept-stage">
        {first ? (
          <h1 className="concept-wordmark" id={`${variant}-title`}>
            swaykit<span>®</span>
          </h1>
        ) : (
          <h2 className="concept-wordmark" id={`${variant}-title`}>
            play
            <br />
            <em>with it.</em>
          </h2>
        )}
        <Artwork variant={variant} />
        <div className="concept-note mono">
          <MoveUpRight size={15} />{" "}
          {first ? "DRAG TO TURN. LET GO." : "GRAB. THROW. REPEAT."}
        </div>
        <span className="concept-index mono" aria-hidden="true">
          {first ? "FIG. 001" : "FIG. 002"}
          <br />
          LIVE / THREE DIMENSIONS
        </span>
      </div>
      <div className="concept-bottom">
        <p>
          Make the web <em>move.</em>
          <span>Customise. Copy. Create.</span>
        </p>
        <Link
          href="/components/"
          className={`button ${first ? "button-black" : "button-white"}`}
        >
          Explore components <ArrowUpRight size={19} />
        </Link>
        <a
          href={first ? "#kinetic-matter" : "#little-world"}
          className="concept-next"
        >
          Next concept <ArrowDown size={18} />
        </a>
      </div>
    </section>
  );
}

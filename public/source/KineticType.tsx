"use client";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export type KineticTypeProps = {
  text?: string;
  size?: number;
  duration?: number;
  stagger?: number;
  distance?: number;
  font?: "sans" | "serif" | "mono";
  outline?: boolean;
  replayKey?: number;
  paused?: boolean;
};
export default function KineticType({
  text = "Make it move.",
  size = 96,
  duration = 1,
  stagger = 0.06,
  distance = 110,
  font = "sans",
  outline = false,
  replayKey = 0,
  paused = false,
}: KineticTypeProps) {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        if (paused) return;
        const tween = gsap.fromTo(
          ".kinetic-letter",
          { yPercent: distance, rotate: 6, opacity: 0 },
          {
            yPercent: 0,
            rotate: 0,
            opacity: 1,
            duration,
            stagger,
            ease: "expo.out",
            paused,
          },
        );
        return () => {
          tween.kill();
        };
      });
      return () => media.revert();
    },
    {
      scope: root,
      dependencies: [text, duration, stagger, distance, replayKey, paused],
      revertOnUpdate: true,
    },
  );
  return (
    <div
      ref={root}
      role="img"
      aria-label={text || "Empty text"}
      style={{
        containerType: "inline-size",
        width: "100%",
        fontFamily:
          font === "serif"
            ? "Georgia, serif"
            : font === "mono"
              ? "monospace"
              : "inherit",
        fontWeight: font === "serif" ? 400 : 650,
        lineHeight: 1.1,
        maxWidth: "100%",
        textAlign: "center",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          fontSize: `clamp(24px, 16cqw, ${size}px)`,
          letterSpacing: "-0.065em",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          columnGap: "0.28em",
        }}
      >
        {text.split(" ").map((word, wi) => (
          <span
            key={wi}
            style={{
              display: "inline-flex",
              overflow: "hidden",
              paddingBottom: "0.12em",
              maxWidth: "100%",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {Array.from(word).map((char, ci) => (
              <span
                className="kinetic-letter"
                key={ci}
                style={{
                  display: "inline-block",
                  ...(outline
                    ? {
                        WebkitTextStroke: "1px currentColor",
                        WebkitTextFillColor: "transparent",
                      }
                    : {}),
                }}
              >
                {char}
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

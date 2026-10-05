import type { KineticTypeProps } from "@/registry/kinetic-type";
export const catalog = [
  {
    slug: "kinetic-type",
    name: "Kinetic Type",
    category: "Text",
    description:
      "An expressive, character-by-character reveal. Your words, with a little more feeling.",
    engine: "GSAP",
    tags: ["text", "typography", "reveal", "gsap"],
  },
];
export const defaults: Required<KineticTypeProps> = {
  text: "Make it move.",
  size: 96,
  duration: 1,
  stagger: 0.06,
  distance: 110,
  font: "sans",
  outline: false,
  replayKey: 0,
  paused: false,
};
export const presets = {
  Signature: defaults,
  Editorial: {
    ...defaults,
    text: "A little drama.",
    font: "serif" as const,
    duration: 1.6,
    stagger: 0.1,
  },
  Outline: { ...defaults, text: "Outside the lines.", outline: true, size: 76 },
  "Quick cut": {
    ...defaults,
    text: "Less. But better.",
    duration: 0.6,
    stagger: 0.025,
  },
};
export function usageCode(config: Required<KineticTypeProps>) {
  const { replayKey: _replay, paused: _paused, ...props } = config;
  return `import KineticType from "./KineticType";\n\nexport default function Example() {\n  return (\n    <KineticType\n${Object.entries(
    props,
  )
    .map(([key, value]) => `      ${key}={${JSON.stringify(value)}}`)
    .join("\n")}\n    />\n  );\n}`;
}
export function parseConfig(input: unknown): Required<KineticTypeProps> {
  if (!input || typeof input !== "object") return { ...defaults };
  const v = input as Record<string, unknown>;
  const number = (key: keyof KineticTypeProps, low: number, high: number) =>
    typeof v[key] === "number" && Number.isFinite(v[key])
      ? Math.min(high, Math.max(low, v[key] as number))
      : (defaults[key] as number);
  return {
    ...defaults,
    text: typeof v.text === "string" ? v.text.slice(0, 100) : defaults.text,
    size: number("size", 24, 160),
    duration: number("duration", 0.2, 3),
    stagger: number("stagger", 0, 0.2),
    distance: number("distance", 0, 180),
    font: ["sans", "serif", "mono"].includes(String(v.font))
      ? (v.font as Required<KineticTypeProps>["font"])
      : "sans",
    outline: v.outline === true,
  };
}

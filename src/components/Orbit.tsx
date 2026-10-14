"use client";
export default function Orbit({ className = "" }: { className?: string }) {
  const paths = Array.from({ length: 64 }, (_, i) => {
    const u = (i / 64) * Math.PI * 2;
    return (
      Array.from({ length: 81 }, (_, j) => {
        const v = (j / 80) * Math.PI * 2,
          x = (145 + 61 * Math.cos(v)) * Math.cos(u),
          y = (145 + 61 * Math.cos(v)) * Math.sin(u),
          z = 61 * Math.sin(v);
        const ry = y * Math.cos(0.85) - z * Math.sin(0.85),
          rz = y * Math.sin(0.85) + z * Math.cos(0.85);
        const rx = x * Math.cos(0.4) + rz * Math.sin(0.4);
        const px = rx * Math.cos(-0.35) - ry * Math.sin(-0.35),
          py = rx * Math.sin(-0.35) + ry * Math.cos(-0.35);
        return `${j === 0 ? "M" : "L"}${(250 + px).toFixed(2)},${(250 + py).toFixed(2)}`;
      }).join(" ") + " Z"
    );
  });
  return (
    <svg
      viewBox="0 0 500 500"
      fill="none"
      className={`orbit-art ${className}`}
      aria-hidden="true"
    >
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke="currentColor"
          strokeWidth="0.9"
          opacity={(0.35 + Math.sin((i / 64) * Math.PI) * 0.6).toFixed(3)}
        />
      ))}
    </svg>
  );
}

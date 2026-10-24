export type FieldMode = "wave" | "ripple" | "saddle";
export const fieldModes: FieldMode[] = ["wave", "ripple", "saddle"];

/** Coupled, unit-mass actuators. Disturbances travel between adjacent pins. */
export class PinField {
  readonly height: Float32Array;
  readonly velocity: Float32Array;
  private readonly acceleration: Float32Array;
  constructor(
    readonly columns: number,
    readonly rows: number,
    readonly spacing: number,
  ) {
    this.height = new Float32Array(columns * rows);
    this.velocity = new Float32Array(columns * rows);
    this.acceleration = new Float32Array(columns * rows);
  }
  x(index: number) {
    return ((index % this.columns) - (this.columns - 1) / 2) * this.spacing;
  }
  z(index: number) {
    return (
      (Math.floor(index / this.columns) - (this.rows - 1) / 2) * this.spacing
    );
  }
  impulse(x: number, z: number, strength = 6, radius = 0.45) {
    for (let i = 0; i < this.height.length; i++) {
      const d2 = (this.x(i) - x) ** 2 + (this.z(i) - z) ** 2;
      this.velocity[i] += strength * Math.exp(-d2 / (radius * radius));
      this.velocity[i] = Math.max(-12, Math.min(12, this.velocity[i]));
    }
  }
  step(
    dt: number,
    pointer: { x: number; z: number; down: boolean; active: boolean },
  ) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const duration = Math.min(dt, 0.05),
      steps = Math.ceil(duration * 180),
      h = duration / steps;
    for (let step = 0; step < steps; step++) {
      for (let i = 0; i < this.height.length; i++) {
        const x = i % this.columns,
          z = Math.floor(i / this.columns),
          v = this.height[i];
        const laplacian =
          (x > 0 ? this.height[i - 1] - v : 0) +
          (x < this.columns - 1 ? this.height[i + 1] - v : 0) +
          (z > 0 ? this.height[i - this.columns] - v : 0) +
          (z < this.rows - 1 ? this.height[i + this.columns] - v : 0);
        const distance =
          (this.x(i) - pointer.x) ** 2 + (this.z(i) - pointer.z) ** 2;
        const touch = pointer.active
          ? (pointer.down ? -70 : 13) * Math.exp(-distance / 0.28)
          : 0;
        this.acceleration[i] =
          laplacian * 145 - v * 34 - this.velocity[i] * 5.4 + touch;
      }
      for (let i = 0; i < this.height.length; i++) {
        this.velocity[i] += this.acceleration[i] * h;
        this.height[i] += this.velocity[i] * h;
        if (Math.abs(this.height[i]) > 1.1) {
          this.height[i] = Math.sign(this.height[i]) * 1.1;
          this.velocity[i] *= -0.18;
        }
      }
    }
  }
  reset() {
    this.height.fill(0);
    this.velocity.fill(0);
  }
}

export function surfaceHeight(
  mode: FieldMode,
  x: number,
  z: number,
  phase: number,
  amplitude: number,
) {
  const r = Math.hypot(x, z);
  const wave =
    mode === "wave"
      ? Math.sin(x * 1.25 + z * 0.75 - phase) * 0.62 +
        Math.cos(z * 1.6 + phase * 0.65) * 0.28
      : mode === "ripple"
        ? Math.cos(r * 2.4 - phase * 1.4) * Math.exp(-r * 0.12)
        : Math.sin(x * 1.05 + phase * 0.3) * Math.cos(z * 1.2 - phase * 0.25);
  return 0.62 + wave * amplitude * 0.58;
}

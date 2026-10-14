type Vector = { x: number; y: number; z: number };

/** A unit-mass damped spring, substepped so dragging feels consistent across frame rates. */
export function advanceSpring(
  position: Vector,
  velocity: Vector,
  target: Vector,
  dt: number,
  stiffness = 28,
  damping = 6.5,
  maxSpeed = 18,
) {
  if (!Number.isFinite(dt) || dt <= 0) return;
  const duration = Math.min(dt, 0.05);
  const steps = Math.ceil(duration * 120);
  const step = duration / steps;
  for (let i = 0; i < steps; i++) {
    for (const axis of ["x", "y", "z"] as const) {
      velocity[axis] +=
        ((target[axis] - position[axis]) * stiffness -
          velocity[axis] * damping) *
        step;
    }
    const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      velocity.x *= scale;
      velocity.y *= scale;
      velocity.z *= scale;
    }
    position.x += velocity.x * step;
    position.y += velocity.y * step;
    position.z += velocity.z * step;
  }
}

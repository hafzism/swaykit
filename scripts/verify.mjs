import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const catalogSource = await readFile("src/lib/catalog.ts", "utf8");
const compiled = ts.transpileModule(catalogSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const { defaults, parseConfig, usageCode, presets } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
assert.deepEqual(parseConfig(null), defaults);
const invalid = parseConfig({
  text: "a".repeat(300),
  size: -50,
  duration: Infinity,
  stagger: 99,
  distance: -1,
  font: "unknown",
  outline: "true",
});
assert.equal(invalid.text.length, 100);
assert.equal(invalid.size, 24);
assert.equal(invalid.duration, defaults.duration);
assert.equal(invalid.stagger, 0.2);
assert.equal(invalid.distance, 0);
assert.equal(invalid.font, "sans");
assert.equal(invalid.outline, false);
for (const config of [
  ...Object.values(presets),
  { ...defaults, text: 'Quotes " and backslashes \\ and\nnewlines <>&' },
]) {
  const parsed = parseConfig(JSON.parse(JSON.stringify(config)));
  assert.equal(parsed.text, config.text);
  const code = usageCode(parsed);
  assert.ok(code.includes(`text={${JSON.stringify(parsed.text)}}`));
  assert.ok(!code.includes("replayKey="));
  const ast = ts.createSourceFile(
    "example.tsx",
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  assert.equal(
    ast.parseDiagnostics.length,
    0,
    "Exported JSX must remain valid for arbitrary text",
  );
}
const source = await readFile("src/registry/kinetic-type.tsx", "utf8");
const registry = JSON.parse(
  await readFile("public/r/kinetic-type.json", "utf8"),
);
assert.equal(
  registry.files[0].content,
  source,
  "Registry must deliver the exact preview source",
);
assert.equal(await readFile("public/source/KineticType.tsx", "utf8"), source);
assert.deepEqual(registry.dependencies, ["gsap", "@gsap/react"]);
console.log(
  "Verified configuration bounds, round trips, JSX escaping, and exact registry source.",
);

const springSource = await readFile("src/lib/spring-motion.ts", "utf8");
const springCompiled = ts.transpileModule(springSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const { advanceSpring } = await import(
  `data:text/javascript;base64,${Buffer.from(springCompiled).toString("base64")}`
);
function settle(fps) {
  const position = { x: 4, y: -2, z: 3 },
    velocity = { x: 9, y: 8, z: -3 },
    target = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < fps * 3; i++)
    advanceSpring(position, velocity, target, 1 / fps);
  assert.ok(
    Math.hypot(position.x, position.y, position.z) < 0.01,
    "Released characters return to their home",
  );
  return position;
}
const at30 = settle(30),
  at60 = settle(60),
  at120 = settle(120);
for (const axis of ["x", "y", "z"]) {
  assert.ok(
    Math.abs(at30[axis] - at60[axis]) < 0.0001,
    "Spring movement is stable at 30 and 60 fps",
  );
  assert.ok(
    Math.abs(at60[axis] - at120[axis]) < 0.0001,
    "Spring movement is stable at 60 and 120 fps",
  );
}
const fastPosition = { x: 0, y: 0, z: 0 },
  fastVelocity = { x: 20000, y: -10000, z: 5000 };
advanceSpring(fastPosition, fastVelocity, { x: 10000, y: 10000, z: 10000 }, 1);
assert.ok(
  Math.hypot(fastVelocity.x, fastVelocity.y, fastVelocity.z) <= 18.00001,
  "Fast dragging cannot create unbounded velocity",
);
assert.ok(
  Object.values(fastPosition).every(Number.isFinite),
  "A delayed frame remains finite",
);
console.log(
  "Verified spring settling, frame-rate consistency, and bounded dragging.",
);

const fieldSource = await readFile("src/lib/form-dynamics.ts", "utf8");
const fieldCompiled = ts.transpileModule(fieldSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const { PinField, surfaceHeight, fieldModes } = await import(
  `data:text/javascript;base64,${Buffer.from(fieldCompiled).toString("base64")}`
);
const idlePointer = { x: 0, z: 0, down: false, active: false };
const lattice = new PinField(15, 15, 0.208),
  centre = 7 * 15 + 7;
lattice.impulse(0, 0, 8, 0.05);
assert.equal(lattice.height[centre + 3], 0);
for (let i = 0; i < 30; i++) lattice.step(1 / 120, idlePointer);
assert.ok(
  Math.abs(lattice.height[centre + 3]) > 0.001,
  "Pressure must propagate to neighbouring actuators",
);
for (let i = 0; i < 120 * 5; i++) lattice.step(1 / 120, idlePointer);
assert.ok(
  Math.max(...lattice.height.map(Math.abs)) < 0.001,
  "Released lattice must dissipate energy",
);
for (let i = 0; i < 500; i++) {
  lattice.impulse(Math.sin(i) * 2, Math.cos(i) * 2, 100);
  lattice.step(i % 2 ? 1 : 1 / 240, { x: 0, z: 0, down: true, active: true });
}
assert.ok(
  [...lattice.height, ...lattice.velocity].every(Number.isFinite),
  "Rapid presses and delayed frames must remain finite",
);
assert.ok(
  lattice.height.every((h) => Math.abs(h) <= 1.10001),
  "Actuator travel must stay inside mechanical bounds",
);
lattice.reset();
assert.ok(
  [...lattice.height, ...lattice.velocity].every((value) => value === 0),
  "Reset removes stored energy",
);
for (const mode of fieldModes) {
  for (let x = -4; x <= 4; x += 0.2) {
    const height = surfaceHeight(mode, x, x / 2, 19.2, 1);
    assert.ok(
      height >= 0 && height <= 1.21,
      "Every mode fits the actuator stroke",
    );
  }
}
console.log(
  "Verified FORM wave propagation, energy decay, bounded pressure, and reset.",
);

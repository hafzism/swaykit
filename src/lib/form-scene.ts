import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  PinField,
  fieldModes,
  surfaceHeight,
  type FieldMode,
} from "./form-dynamics";

export type FormState = {
  mode: FieldMode;
  amplitude: number;
  rate: number;
  held: boolean;
  action: string;
};
export type FormScene = {
  resize(): void;
  setActive(active: boolean): void;
  dispose(): void;
  setMode(mode: FieldMode): void;
  setAmplitude(value: number): void;
  setRate(value: number): void;
  toggleHold(): void;
  pulse(): void;
  reset(): void;
};
type Part = "field" | "dial" | "fader" | "hold" | "pulse" | "case" | FieldMode;
const clamp = THREE.MathUtils.clamp,
  TAU = Math.PI * 2;

export async function createFormScene(
  canvas: HTMLCanvasElement,
  onChange: (state: FormState) => void,
): Promise<FormScene> {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(
    Math.min(devicePixelRatio, canvas.clientWidth < 700 ? 1.5 : 1.75),
  );
  renderer.setClearColor(0xf1f1ed, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
  const rig = new THREE.Group();
  scene.add(rig);
  const envScene = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer),
    environment = pmrem.fromScene(envScene, 0.035);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.8;
  envScene.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x70706e, 2.1));
  const key = new THREE.DirectionalLight(0xffffff, 4.5);
  key.position.set(-4, 10, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, {
    left: -9,
    right: 9,
    top: 9,
    bottom: -9,
    near: 0.5,
    far: 35,
  });
  key.shadow.normalBias = 0.025;
  key.shadow.bias = -0.00015;
  key.shadow.radius = 3;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 2.0);
  rim.position.set(4, 5, -5);
  scene.add(rim);

  const textures: THREE.Texture[] = [];
  const aluminum = new THREE.MeshStandardMaterial({
    color: 0xbabbb9,
    metalness: 0.82,
    roughness: 0.32,
  });
  const edgeMetal = new THREE.MeshStandardMaterial({
    color: 0xd8d9d6,
    metalness: 0.93,
    roughness: 0.19,
  });
  const ivory = new THREE.MeshStandardMaterial({
    color: 0xe8e8e3,
    metalness: 0.25,
    roughness: 0.32,
  });
  const graphite = new THREE.MeshStandardMaterial({
    color: 0x17191a,
    metalness: 0.38,
    roughness: 0.36,
  });
  const rubber = new THREE.MeshStandardMaterial({
    color: 0x141515,
    roughness: 0.92,
  });
  const pinMaterial = new THREE.MeshStandardMaterial({
    color: 0xd0d2cf,
    metalness: 0.83,
    roughness: 0.24,
  });
  const stemMaterial = new THREE.MeshStandardMaterial({
    color: 0x787c7c,
    metalness: 0.98,
    roughness: 0.22,
  });
  const whiteLight = new THREE.MeshBasicMaterial({
    color: 0xf8fff8,
    toneMapped: false,
  });
  const darkLight = new THREE.MeshBasicMaterial({ color: 0x454847 });
  const pickables: THREE.Object3D[] = [];
  const rounded = (w: number, h: number, d: number, radius: number) =>
    new RoundedBoxGeometry(w, h, d, 3, radius);
  function mesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    parent: THREE.Object3D = rig,
  ) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function hit(object: THREE.Object3D, part: Part) {
    object.userData.part = part;
    pickables.push(object);
    return object;
  }
  const caseMesh = mesh(rounded(9.5, 0.68, 7.0, 0.25), aluminum, 0, -0.04);
  hit(caseMesh, "case");
  mesh(rounded(9.48, 0.065, 6.98, 0.22), edgeMetal, 0, 0.285);
  mesh(rounded(9.38, 0.065, 6.88, 0.2), ivory, 0, 0.335);
  mesh(rounded(9.2, 0.07, 6.7, 0.2), graphite, 0, -0.39);
  // Rubber isolation feet and visible machining on the front edge.
  for (const x of [-3.8, 3.8])
    for (const z of [-2.6, 2.6])
      mesh(
        new THREE.CylinderGeometry(0.38, 0.31, 0.16, 24),
        rubber,
        x,
        -0.49,
        z,
      );
  for (let i = 0; i < 30; i++)
    mesh(
      rounded(0.055, 0.18, 0.015, 0.012),
      graphite,
      -3.7 + i * 0.16,
      -0.08,
      3.497,
    );
  const socket = mesh(
    rounded(0.65, 0.17, 0.03, 0.075),
    graphite,
    3.3,
    -0.08,
    3.495,
  );
  mesh(rounded(0.39, 0.055, 0.045, 0.02), edgeMetal, 3.3, -0.08, 3.51);
  socket.castShadow = false;

  // Recessed instrument bed: 768 caps and 768 pistons, each instanced.
  const field = new PinField(32, 24, 0.208),
    fieldX = -0.82,
    fieldZ = -0.25;
  mesh(rounded(6.98, 0.1, 5.4, 0.15), edgeMetal, fieldX, 0.38, fieldZ);
  mesh(rounded(6.83, 0.08, 5.25, 0.12), graphite, fieldX, 0.425, fieldZ);
  const capGeometry = new RoundedBoxGeometry(0.184, 0.135, 0.184, 1, 0.033);
  const caps = new THREE.InstancedMesh(
    capGeometry,
    pinMaterial,
    field.height.length,
  );
  const stems = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.043, 0.055, 1, 10),
    stemMaterial,
    field.height.length,
  );
  const collars = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.078, 0.078, 0.025, 12),
    rubber,
    field.height.length,
  );
  caps.castShadow = caps.receiveShadow = true;
  stems.receiveShadow = true;
  caps.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  stems.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  // Explicit bounds encompass every actuator position, including depressed and tilted pins.
  const bounds = new THREE.Sphere(new THREE.Vector3(fieldX, 1.1, fieldZ), 5.2);
  caps.boundingSphere = bounds.clone();
  stems.boundingSphere = bounds.clone();
  rig.add(caps, stems, collars);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < field.height.length; i++) {
    dummy.position.set(field.x(i) + fieldX, 0.48, field.z(i) + fieldZ);
    dummy.updateMatrix();
    collars.setMatrixAt(i, dummy.matrix);
  }
  const fieldHit = mesh(
    new THREE.BoxGeometry(6.7, 1.5, 5.1),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
    fieldX,
    1.05,
    fieldZ,
  );
  fieldHit.castShadow = fieldHit.receiveShadow = false;
  hit(fieldHit, "field");

  // Surface graphics are local canvas textures; no image/model network dependency.
  function texture(
    width: number,
    height: number,
    draw: (ctx: CanvasRenderingContext2D) => void,
  ) {
    const source = document.createElement("canvas");
    source.width = width;
    source.height = height;
    const ctx = source.getContext("2d")!;
    draw(ctx);
    const map = new THREE.CanvasTexture(source);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    textures.push(map);
    return { map, ctx };
  }
  const print = texture(2048, 1536, (ctx) => {
    const tx = (x: number) => ((x + 4.7) / 9.4) * 2048,
      tz = (z: number) => ((z + 3.45) / 6.9) * 1536;
    function label(
      text: string,
      x: number,
      z: number,
      size = 18,
      align: CanvasTextAlign = "center",
    ) {
      ctx.fillStyle = "#353936";
      ctx.font = `${size > 30 ? "600" : "500"} ${size}px ${size > 30 ? "Arial" : "monospace"}`;
      ctx.textAlign = align;
      ctx.fillText(text, tx(x), tz(z));
    }
    label("SWAYKIT", -4.02, 3.05, 30, "left");
    label("FORM—001", -4.05, -3.08, 21, "left");
    label("768 / TACTILE SURFACE", 2.45, -3.08, 16, "right");
    label("FREQUENCY", 3.64, -0.77, 17);
    label("HEIGHT", 3.64, 1.78, 17);
    label("HOLD", 3.64, 3.05, 17);
    label("IMPULSE", 1.8, 3.27, 15);
    for (let i = 0; i < 21; i++) {
      const a = ((-140 + i * 14) * Math.PI) / 180;
      const x = 3.64 + Math.sin(a) * 0.77,
        z = -1.7 - Math.cos(a) * 0.77;
      ctx.strokeStyle = i % 5 === 0 ? "#555b56" : "#a2a5a1";
      ctx.lineWidth = i % 5 === 0 ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(tx(x), tz(z));
      ctx.lineTo(tx(x + Math.sin(a) * 0.065), tz(z - Math.cos(a) * 0.065));
      ctx.stroke();
    }
    for (let i = 0; i < 11; i++) {
      const z = -0.35 + i * 0.16;
      ctx.strokeStyle = "#8d938f";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tx(3.12), tz(z));
      ctx.lineTo(tx(i % 5 === 0 ? 3.3 : 3.24), tz(z));
      ctx.stroke();
    }
  });
  const graphics = mesh(
    new THREE.PlaneGeometry(9.4, 6.9),
    new THREE.MeshBasicMaterial({
      map: print.map,
      transparent: true,
      depthWrite: false,
    }),
    0,
    0.375,
  );
  graphics.rotation.x = -Math.PI / 2;
  graphics.castShadow = false;

  // Recessed Torx-like screws, including their cutouts, catch the studio lighting.
  for (const x of [-4.48, 4.48])
    for (const z of [-3.23, 3.23]) {
      mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.018, 24),
        edgeMetal,
        x,
        0.382,
        z,
      );
      mesh(
        new THREE.CylinderGeometry(0.032, 0.032, 0.021, 6),
        graphite,
        x,
        0.39,
        z,
      );
    }

  // A knurled encoder: drag vertically/horizontally, or use the wheel over it.
  mesh(
    new THREE.CylinderGeometry(0.64, 0.67, 0.08, 64),
    graphite,
    3.64,
    0.425,
    -1.7,
  );
  const dial = new THREE.Group();
  dial.position.set(3.64, 0.47, -1.7);
  rig.add(dial);
  hit(
    mesh(
      new THREE.CylinderGeometry(0.53, 0.57, 0.38, 64),
      graphite,
      0,
      0.19,
      0,
      dial,
    ),
    "dial",
  );
  hit(
    mesh(
      new THREE.CylinderGeometry(0.49, 0.52, 0.06, 64),
      aluminum,
      0,
      0.41,
      0,
      dial,
    ),
    "dial",
  );
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * TAU;
    const rib = mesh(
      new THREE.BoxGeometry(0.018, 0.29, 0.025),
      edgeMetal,
      Math.sin(a) * 0.543,
      0.2,
      Math.cos(a) * 0.543,
      dial,
    );
    rib.rotation.y = a;
    rib.castShadow = false;
  }
  mesh(rounded(0.035, 0.012, 0.18, 0.01), graphite, 0, 0.448, -0.31, dial);

  // Motorised height fader, separate track and cap.
  mesh(rounded(0.12, 0.025, 1.9, 0.05), graphite, 3.64, 0.394, 0.45);
  const fader = new THREE.Group();
  fader.position.set(3.64, 0.43, 0.45);
  rig.add(fader);
  hit(
    mesh(rounded(0.72, 0.17, 0.36, 0.06), graphite, 0, 0.08, 0, fader),
    "fader",
  );
  mesh(rounded(0.65, 0.035, 0.28, 0.025), edgeMetal, 0, 0.18, 0, fader);
  mesh(new THREE.BoxGeometry(0.56, 0.015, 0.02), graphite, 0, 0.203, 0, fader);
  const faderHit = mesh(
    new THREE.BoxGeometry(0.9, 0.25, 2.0),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
    3.64,
    0.5,
    0.45,
  );
  faderHit.castShadow = false;
  hit(faderHit, "fader");

  const modeKeys: THREE.Group[] = [],
    modeLEDs: THREE.Mesh[] = [];
  fieldModes.forEach((mode, i) => {
    const x = -2.35 + i * 1.13,
      group = new THREE.Group();
    group.position.set(x, 0.42, 2.98);
    rig.add(group);
    modeKeys.push(group);
    mesh(rounded(0.92, 0.06, 0.58, 0.08), graphite, x, 0.39, 2.98);
    hit(mesh(rounded(0.83, 0.15, 0.49, 0.06), ivory, 0, 0.12, 0, group), mode);
    const legend = texture(256, 128, (ctx) => {
      ctx.fillStyle = "#333935";
      ctx.textAlign = "center";
      ctx.font = "500 25px monospace";
      ctx.fillText(mode.toUpperCase(), 128, 80);
      ctx.strokeStyle = "#333935";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let j = 0; j <= 48; j++) {
        const x = 78 + j * 2;
        const y = 30 + Math.sin(j / (mode === "ripple" ? 2 : 6)) * 9;
        j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    });
    const legendMesh = mesh(
      new THREE.PlaneGeometry(0.75, 0.4),
      new THREE.MeshBasicMaterial({ map: legend.map, transparent: true }),
      0,
      0.201,
      0,
      group,
    );
    legendMesh.rotation.x = -Math.PI / 2;
    legendMesh.castShadow = false;
    modeLEDs.push(
      mesh(new THREE.SphereGeometry(0.035, 10, 8), darkLight, x, 0.43, 2.56),
    );
  });
  mesh(
    new THREE.CylinderGeometry(0.42, 0.44, 0.065, 48),
    graphite,
    1.8,
    0.42,
    2.85,
  );
  const pulseKey = mesh(
    new THREE.CylinderGeometry(0.34, 0.37, 0.18, 48),
    edgeMetal,
    1.8,
    0.54,
    2.85,
  );
  hit(pulseKey, "pulse");
  const pulseMark = mesh(
    new THREE.TorusGeometry(0.14, 0.012, 8, 40),
    graphite,
    1.8,
    0.635,
    2.85,
  );
  pulseMark.rotation.x = -Math.PI / 2;
  mesh(rounded(0.8, 0.04, 0.42, 0.2), graphite, 3.64, 0.41, 2.54);
  const toggle = mesh(rounded(0.39, 0.16, 0.33, 0.14), ivory, 3.45, 0.49, 2.54);
  hit(toggle, "hold");
  const holdHit = mesh(
    new THREE.BoxGeometry(1, 0.3, 0.65),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
    3.64,
    0.5,
    2.54,
  );
  holdHit.castShadow = false;
  hit(holdHit, "hold");

  const display = texture(512, 256, () => {});
  mesh(rounded(1.38, 0.055, 0.64, 0.07), graphite, 3.64, 0.397, -2.88);
  const screen = mesh(
    new THREE.PlaneGeometry(1.23, 0.5),
    new THREE.MeshBasicMaterial({ map: display.map, toneMapped: false }),
    3.64,
    0.43,
    -2.88,
  );
  screen.rotation.x = -Math.PI / 2;
  screen.castShadow = false;

  // Soft contact patch plus true directional shadows from each moving part.
  const contact = texture(256, 256, (ctx) => {
    const gradient = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
    gradient.addColorStop(0, "rgba(0,0,0,.24)");
    gradient.addColorStop(0.6, "rgba(0,0,0,.10)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  });
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.ShadowMaterial({ opacity: 0.16 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.59;
  floor.receiveShadow = true;
  scene.add(floor);
  const softShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 11),
    new THREE.MeshBasicMaterial({
      map: contact.map,
      transparent: true,
      depthWrite: false,
    }),
  );
  softShadow.rotation.x = -Math.PI / 2;
  softShadow.position.set(0.3, -0.58, 0.4);
  scene.add(softShadow);

  let state: FormState = {
    mode: "wave",
    amplitude: 0.72,
    rate: 0.45,
    held: false,
    action: "Brush the surface. Feel the response.",
  };
  let active = false,
    disposed = false,
    frame = 0,
    last = 0,
    elapsed = 0,
    phase = 1.2,
    lastScreen = 0;
  let frameSamples = 0,
    frameDuration = 0;
  let pointerDown = false,
    dragging: Part | null = null,
    hover: Part | null = null,
    hoverIndex = -1;
  let startX = 0,
    startY = 0,
    lastX = 0,
    lastY = 0,
    startValue = 0;
  let yaw = -0.13,
    pitch = 0,
    targetYaw = -0.13,
    targetPitch = 0,
    amplitude = state.amplitude,
    rate = state.rate;
  let pulseTravel = 0,
    pulseVelocity = 0,
    pulseUntil = 0,
    activityUntil = 0;
  const buttonTravel = [0, 0, 0],
    buttonVelocity = [0, 0, 0];
  const pointer = { x: 0, z: 0, down: false, active: false };
  const wind = new THREE.Vector2(),
    windTarget = new THREE.Vector2();
  const heights = new Float32Array(field.height.length);
  const touchTiltX = new Float32Array(field.height.length),
    touchTiltZ = new Float32Array(field.height.length);
  const raycaster = new THREE.Raycaster(),
    mouse = new THREE.Vector2(9, 9),
    localPoint = new THREE.Vector3();
  const inverse = new THREE.Matrix4(),
    localRay = new THREE.Ray(),
    fieldPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.95);
  const controlPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let pointerInside = false;
  let activePointer: number | null = null;
  let captureTarget: HTMLElement = canvas;
  // Only the projected object owns touch gestures. The surrounding stage scrolls normally.
  const touchSurface = document.createElement("div");
  touchSurface.className = "form-touch-surface";
  touchSurface.setAttribute("aria-hidden", "true");
  canvas.parentElement!.appendChild(touchSurface);
  const projected = new THREE.Vector3();
  const coarsePointer = window.matchMedia("(pointer: coarse)");
  function placeTouchSurface() {
    if (canvas.clientWidth > 760 && !coarsePointer.matches) return;
    rig.updateMatrixWorld();
    camera.updateMatrixWorld();
    let left = Infinity,
      top = Infinity,
      right = -Infinity,
      bottom = -Infinity;
    for (const x of [-4.8, 4.8])
      for (const y of [-0.58, 2.3])
        for (const z of [-3.5, 3.5]) {
          projected.set(x, y, z).applyMatrix4(rig.matrixWorld).project(camera);
          const px = ((projected.x + 1) * canvas.clientWidth) / 2;
          const py = ((1 - projected.y) * canvas.clientHeight) / 2;
          left = Math.min(left, px);
          right = Math.max(right, px);
          top = Math.min(top, py);
          bottom = Math.max(bottom, py);
        }
    left = Math.max(18, left - 8);
    right = Math.min(canvas.clientWidth - 18, right + 8);
    top = Math.max(0, top - 8);
    bottom = Math.min(canvas.clientHeight, bottom + 8);
    Object.assign(touchSurface.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${right - left}px`,
      height: `${bottom - top}px`,
    });
  }
  function publish(action?: string) {
    if (action) state.action = action;
    onChange({ ...state });
  }
  function wake() {
    activityUntil = elapsed + 3;
    if (active && !frame && !disposed) frame = requestAnimationFrame(animate);
  }
  function setMode(mode: FieldMode) {
    state.mode = mode;
    field.impulse(0, 0, 3);
    publish(
      `${mode[0].toUpperCase() + mode.slice(1)} selected. Same surface, a new response.`,
    );
    wake();
  }
  function setAmplitude(value: number) {
    state.amplitude = clamp(value, 0, 1);
    publish(
      `Height ${Math.round(state.amplitude * 100)}% · Every pin follows.`,
    );
    wake();
  }
  function setRate(value: number) {
    state.rate = clamp(value, 0, 1);
    publish(
      `Frequency ${Math.round(state.rate * 100)}% · Turn it to find your rhythm.`,
    );
    wake();
  }
  function toggleHold() {
    state.held = !state.held;
    publish(
      state.held
        ? "Shape held. You can still touch it."
        : "Released. Back into motion.",
    );
    wake();
  }
  function pulse() {
    field.impulse(0, 0, 11, 0.65);
    pulseUntil = elapsed + 0.17;
    publish("One touch. A ripple through the whole surface.");
    wake();
  }
  function reset() {
    state = {
      mode: "wave",
      amplitude: 0.72,
      rate: 0.45,
      held: false,
      action: "A fresh start. Make something move.",
    };
    targetYaw = -0.13;
    targetPitch = 0;
    phase = 1.2;
    field.reset();
    publish();
    wake();
  }
  const hints: Record<Part, string> = {
    field: "Brush to lift. Press and drag to sculpt.",
    dial: "Frequency · Drag or scroll to turn.",
    fader: "Height · Slide to reshape the surface.",
    hold: "Hold · Latch the shape. Keep playing.",
    pulse: "Impulse · Press to send a wave.",
    case: "Drag the case to change your perspective.",
    wave: "Wave · A rolling landscape.",
    ripple: "Ripple · Concentric motion.",
    saddle: "Saddle · An interference pattern.",
  };
  function rayFromPointer() {
    rig.updateMatrixWorld();
    raycaster.setFromCamera(mouse, camera);
    inverse.copy(rig.matrixWorld).invert();
    localRay.copy(raycaster.ray).applyMatrix4(inverse);
  }
  function pick() {
    rayFromPointer();
    const intersection = raycaster.intersectObjects(pickables, false)[0];
    return intersection ? (intersection.object.userData.part as Part) : null;
  }
  function updatePointer(event: PointerEvent | WheelEvent) {
    const rect = canvas.getBoundingClientRect();
    mouse.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    pointerInside = true;
    rayFromPointer();
    if (localRay.intersectPlane(fieldPlane, localPoint)) {
      const x = localPoint.x - fieldX,
        z = localPoint.z - fieldZ;
      windTarget.set(
        clamp((x - pointer.x) * 1.3, -0.4, 0.4),
        clamp((z - pointer.z) * 1.3, -0.4, 0.4),
      );
      pointer.x = x;
      pointer.z = z;
    }
  }
  function onMove(event: PointerEvent) {
    if (pointerDown && event.pointerId !== activePointer) return;
    updatePointer(event);
    if (pointerDown) {
      if (dragging === "dial")
        setRate(
          startValue +
            (event.clientX - startX - (event.clientY - startY)) / 220,
        );
      else if (dragging === "fader") {
        if (localRay.intersectPlane(controlPlane, localPoint))
          setAmplitude(1 - (localPoint.z + 0.35) / 1.6);
      } else if (dragging === "case") {
        targetYaw = clamp(
          targetYaw + (event.clientX - lastX) * 0.004,
          -0.72,
          0.55,
        );
        targetPitch = clamp(
          targetPitch + (event.clientY - lastY) * 0.003,
          -0.13,
          0.2,
        );
      }
    }
    lastX = event.clientX;
    lastY = event.clientY;
    wake();
  }
  function onDown(event: PointerEvent) {
    if (event.button !== 0 || pointerDown) return;
    updatePointer(event);
    dragging = pick();
    if (!dragging) return;
    pointerDown = true;
    activePointer = event.pointerId;
    pointer.down = dragging === "field";
    startX = lastX = event.clientX;
    startY = lastY = event.clientY;
    startValue = state.rate;
    captureTarget = event.currentTarget as HTMLElement;
    captureTarget.setPointerCapture(event.pointerId);
    canvas.focus({ preventScroll: true });
    if (dragging === "field") {
      field.impulse(pointer.x, pointer.z, -6);
      publish("Pressure travels. Release and watch it settle.");
    }
    if (dragging === "pulse") pulse();
    if (fieldModes.includes(dragging as FieldMode))
      setMode(dragging as FieldMode);
    if (dragging === "hold") toggleHold();
    if (
      dragging === "fader" &&
      localRay.intersectPlane(controlPlane, localPoint)
    )
      setAmplitude(1 - (localPoint.z + 0.35) / 1.6);
    wake();
  }
  function release(event?: PointerEvent) {
    if (event && activePointer !== null && event.pointerId !== activePointer)
      return;
    if (pointer.down) field.impulse(pointer.x, pointer.z, 4.5);
    pointerDown = false;
    pointer.down = false;
    dragging = null;
    const pointerId = activePointer;
    activePointer = null;
    if (pointerId !== null && captureTarget.hasPointerCapture(pointerId))
      captureTarget.releasePointerCapture(pointerId);
    if (event?.pointerType === "touch") {
      pointerInside = false;
      pointer.active = false;
      hover = null;
    }
    wake();
  }
  function leave() {
    if (!pointerDown) {
      pointerInside = false;
      pointer.active = false;
      hover = null;
      canvas.style.cursor = "default";
    }
  }
  function onWheel(event: WheelEvent) {
    updatePointer(event);
    if (pick() === "dial") {
      event.preventDefault();
      setRate(state.rate - event.deltaY * 0.0015);
    }
  }
  function onKey(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (
      ![
        "1",
        "2",
        "3",
        " ",
        "h",
        "r",
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
      ].includes(key)
    )
      return;
    event.preventDefault();
    if (["1", "2", "3"].includes(key)) setMode(fieldModes[Number(key) - 1]);
    else if (key === " ") pulse();
    else if (key === "h" && !event.repeat) toggleHold();
    else if (key === "r") reset();
    else if (key === "arrowup") setAmplitude(state.amplitude + 0.05);
    else if (key === "arrowdown") setAmplitude(state.amplitude - 0.05);
    else if (key === "arrowleft") setRate(state.rate - 0.05);
    else if (key === "arrowright") setRate(state.rate + 0.05);
  }
  const preventContextMenu = (event: Event) => event.preventDefault();
  const inputTargets: HTMLElement[] = [canvas, touchSurface];
  for (const target of inputTargets) {
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerdown", onDown);
    target.addEventListener("pointerup", release);
    target.addEventListener("pointercancel", release);
    target.addEventListener("lostpointercapture", release);
    target.addEventListener("pointerleave", leave);
    target.addEventListener("contextmenu", preventContextMenu);
  }
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("keydown", onKey);
  const onBlur = () => release();
  window.addEventListener("blur", onBlur);

  function resize() {
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    // Fit the entire instrument at both desktop and portrait widths.
    const distance = Math.max(16.8, 21.2 / camera.aspect);
    camera.position.set(distance * 0.34, distance * 0.67, distance * 0.73);
    camera.lookAt(0, 0.25, 0);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    placeTouchSurface();
    wake();
    if (!active) renderer.render(scene, camera);
  }
  function updateDisplay() {
    const ctx = display.ctx;
    ctx.fillStyle = "#141b19";
    ctx.fillRect(0, 0, 512, 256);
    ctx.font = "26px monospace";
    ctx.fillStyle = "#dce8de";
    ctx.textAlign = "left";
    ctx.fillText(state.mode.toUpperCase(), 24, 43);
    ctx.textAlign = "right";
    ctx.fillStyle = "#8a9a90";
    ctx.fillText(
      state.held
        ? "HOLD"
        : `${Math.round(state.rate * 100)
            .toString()
            .padStart(2, "0")} HZ`,
      488,
      43,
    );
    ctx.strokeStyle = "#34453c";
    ctx.lineWidth = 1;
    for (let x = 24; x < 500; x += 38) {
      ctx.beginPath();
      ctx.moveTo(x, 70);
      ctx.lineTo(x, 230);
      ctx.stroke();
    }
    for (let y = 75; y < 240; y += 30) {
      ctx.beginPath();
      ctx.moveTo(24, y);
      ctx.lineTo(488, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "#dce8de";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < field.columns; i++) {
      const x = 24 + (i / (field.columns - 1)) * 464,
        y = 212 - heights[field.columns * 12 + i] * 95;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    display.map.needsUpdate = true;
  }
  function render(dt: number) {
    elapsed += dt;
    const ease = 1 - Math.exp(-dt * 9);
    amplitude += (state.amplitude - amplitude) * ease;
    rate += (state.rate - rate) * ease;
    if (!state.held && !reduced.matches) phase += dt * (0.25 + rate * 2.1);
    yaw += (targetYaw - yaw) * ease;
    pitch += (targetPitch - pitch) * ease;
    rig.rotation.set(pitch, yaw, 0);
    placeTouchSurface();
    if (pointerInside) {
      const part = pointerDown ? dragging : pick();
      if (part !== hover) {
        hover = part;
        if (part && !pointerDown) publish(hints[part]);
        canvas.style.cursor =
          part === "field"
            ? pointerDown
              ? "grabbing"
              : "crosshair"
            : ["dial", "fader", "case"].includes(part || "")
              ? "grab"
              : part
                ? "pointer"
                : "default";
      }
      pointer.active = part === "field";
      hoverIndex = pointer.active
        ? Math.round(pointer.x / field.spacing + 15.5) +
          Math.round(pointer.z / field.spacing + 11.5) * 32
        : -1;
    }
    field.step(dt, pointer);
    wind.lerp(windTarget, ease);
    windTarget.multiplyScalar(Math.exp(-dt * 8));
    const modeIndex = fieldModes.indexOf(state.mode);
    for (let i = 0; i < field.height.length; i++) {
      const x = field.x(i),
        z = field.z(i);
      const base = surfaceHeight(state.mode, x, z, phase, amplitude);
      const targetHeight = clamp(base + field.height[i], 0.05, 1.8);
      heights[i] += (targetHeight - heights[i]) * (1 - Math.exp(-dt * 17));
      const distance = (x - pointer.x) ** 2 + (z - pointer.z) ** 2;
      const influence = pointer.active ? Math.exp(-distance / 0.65) : 0;
      touchTiltX[i] += (wind.y * influence - touchTiltX[i]) * ease;
      touchTiltZ[i] += (-wind.x * influence - touchTiltZ[i]) * ease;
      const lift = heights[i];
      dummy.position.set(
        x + fieldX + Math.sin(touchTiltZ[i]) * lift * 0.18,
        0.53 + lift,
        z + fieldZ - Math.sin(touchTiltX[i]) * lift * 0.18,
      );
      dummy.rotation.set(touchTiltX[i], 0, touchTiltZ[i]);
      dummy.scale.set(1, 1, 1);
      if (i === hoverIndex) dummy.position.y += 0.025;
      dummy.updateMatrix();
      caps.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x + fieldX, 0.48 + lift / 2, z + fieldZ);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, lift, 1);
      dummy.updateMatrix();
      stems.setMatrixAt(i, dummy.matrix);
    }
    caps.instanceMatrix.needsUpdate = stems.instanceMatrix.needsUpdate = true;
    dial.rotation.y = -(-2.4 + rate * 4.8);
    fader.position.z +=
      (-0.35 + (1 - amplitude) * 1.6 - fader.position.z) * ease;
    toggle.position.x +=
      ((state.held ? 3.83 : 3.45) - toggle.position.x) * ease;
    for (let i = 0; i < 3; i++) {
      const target = modeIndex === i ? -0.075 : 0;
      buttonVelocity[i] +=
        ((target - buttonTravel[i]) * 300 - buttonVelocity[i] * 22) * dt;
      buttonTravel[i] += buttonVelocity[i] * dt;
      modeKeys[i].position.y = 0.42 + buttonTravel[i];
      modeLEDs[i].material = i === modeIndex ? whiteLight : darkLight;
    }
    const pulseTarget =
      (pointerDown && dragging === "pulse") || elapsed < pulseUntil ? -0.11 : 0;
    pulseVelocity +=
      ((pulseTarget - pulseTravel) * 300 - pulseVelocity * 20) * dt;
    pulseTravel += pulseVelocity * dt;
    pulseKey.position.y = 0.54 + pulseTravel;
    pulseMark.position.y = 0.635 + pulseTravel;
    if (elapsed - lastScreen > 0.1) {
      updateDisplay();
      lastScreen = elapsed;
    }
    renderer.render(scene, camera);
  }
  function animate(now: number) {
    frame = 0;
    if (!active || disposed) return;
    const interval = last ? (now - last) / 1000 : 1 / 60;
    const dt = Math.min(interval, 1 / 30);
    last = now;
    frameDuration += interval;
    frameSamples++;
    if (frameSamples >= 90) {
      // Reduce fill cost on slower GPUs without changing the physical simulation.
      if (
        frameDuration / frameSamples > 0.026 &&
        renderer.getPixelRatio() > 1
      ) {
        renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() - 0.25));
        renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      }
      frameDuration = 0;
      frameSamples = 0;
    }
    render(dt);
    if (!reduced.matches || pointerDown || elapsed < activityUntil)
      frame = requestAnimationFrame(animate);
  }
  function setActive(value: boolean) {
    active = value;
    if (value) {
      last = 0;
      wake();
    } else {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      release();
      pointerInside = false;
      pointer.active = false;
    }
  }
  const motionChange = () => wake();
  reduced.addEventListener("change", motionChange);
  // A fully drawn first frame avoids an empty canvas while a hidden tab waits for RAF.
  for (let i = 0; i < field.height.length; i++)
    heights[i] = surfaceHeight(
      state.mode,
      field.x(i),
      field.z(i),
      phase,
      amplitude,
    );
  resize();
  render(1 / 60);
  publish();
  return {
    resize,
    setActive,
    setMode,
    setAmplitude,
    setRate,
    toggleHold,
    pulse,
    reset,
    dispose() {
      disposed = true;
      active = false;
      if (frame) cancelAnimationFrame(frame);
      for (const target of inputTargets) {
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerdown", onDown);
        target.removeEventListener("pointerup", release);
        target.removeEventListener("pointercancel", release);
        target.removeEventListener("lostpointercapture", release);
        target.removeEventListener("pointerleave", leave);
        target.removeEventListener("contextmenu", preventContextMenu);
      }
      touchSurface.remove();
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onBlur);
      reduced.removeEventListener("change", motionChange);
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          (Array.isArray(object.material)
            ? object.material
            : [object.material]
          ).forEach((material) => materials.add(material));
          if (object instanceof THREE.InstancedMesh) object.dispose();
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((map) => map.dispose());
      environment.dispose();
      renderer.dispose();
      canvas.style.cursor = "";
    },
  };
}

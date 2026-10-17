import * as THREE from "three";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { HeroScene } from "./hero-scene";
import { advanceSpring } from "./spring-motion";

type Actor = {
  mesh: THREE.Mesh;
  home: THREE.Vector3;
  velocity: THREE.Vector3;
  halo: THREE.Mesh;
  shadow: THREE.Mesh;
  tilt: number;
};

export async function createToyWorld(
  canvas: HTMLCanvasElement,
): Promise<HeroScene> {
  const [atlas, font] = await Promise.all([
    new THREE.TextureLoader().loadAsync("/art/toy-world.png"),
    new FontLoader().loadAsync("/art/helvetiker-bold.json"),
  ]);
  atlas.colorSpace = THREE.SRGBColorSpace;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 70);
  const root = new THREE.Group();
  scene.add(root);
  const pmrem = new THREE.PMREMGenerator(renderer),
    room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb6b6b6, 3));
  const light = new THREE.DirectionalLight(0xffffff, 4);
  light.position.set(-5, 9, 9);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  Object.assign(light.shadow.camera, {
    left: -10,
    right: 10,
    top: 10,
    bottom: -10,
    near: 0.5,
    far: 35,
  });
  light.shadow.normalBias = 0.04;
  light.shadow.bias = -0.0005;
  light.shadow.radius = 4;
  scene.add(light);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0xf7f7f4, roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.7;
  floor.receiveShadow = true;
  scene.add(floor);
  const front = new THREE.MeshPhysicalMaterial({
    color: 0x111111,
    roughness: 0.6,
    metalness: 0.12,
  });
  const side = new THREE.MeshPhysicalMaterial({
    color: 0x262626,
    roughness: 0.24,
    metalness: 0.4,
  });
  const lettering = new THREE.Group();
  root.add(lettering);
  [
    ["SWAY", 2.3, 0.25],
    ["KIT.", 2.8, -2.05],
  ].forEach(([text, size, y]) => {
    const geometry = new TextGeometry(String(text), {
      font,
      size: Number(size),
      depth: 0.34,
      curveSegments: 8,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.026,
      bevelSegments: 3,
    });
    geometry.computeBoundingBox();
    const mesh = new THREE.Mesh(geometry, [front, side]);
    mesh.position.set(
      -(geometry.boundingBox!.max.x - geometry.boundingBox!.min.x) / 2,
      Number(y),
      -0.85,
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    lettering.add(mesh);
  });

  const material = new THREE.MeshBasicMaterial({
    map: atlas,
    transparent: true,
    alphaTest: 0.035,
    side: THREE.DoubleSide,
    depthWrite: true,
    toneMapped: false,
  });
  // Preserve the generated material detail while keeping the site strictly monochrome.
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      "#include <map_fragment>\ndiffuseColor.rgb = vec3(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)));",
    );
  };
  const depth = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map: atlas,
    alphaTest: 0.2,
  });
  const actors: Actor[] = [];
  const homes = [
    [-3.45, -0.45, 1.35, 4.45],
    [2.35, 0.15, -0.15, 5.45],
    [-1.35, -0.95, 2.1, 3.65],
    [3.65, -1, 2.3, 3.7],
  ];
  const contactCanvas = document.createElement("canvas");
  contactCanvas.width = contactCanvas.height = 128;
  const ctx = contactCanvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(0,0,0,.3)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const contactTexture = new THREE.CanvasTexture(contactCanvas);
  homes.forEach(([x, y, z, scale], i) => {
    const geometry = new THREE.PlaneGeometry(scale, scale);
    const uv = geometry.getAttribute("uv");
    for (let j = 0; j < uv.count; j++)
      uv.setXY(
        j,
        uv.getX(j) * 0.5 + (i % 2) * 0.5,
        uv.getY(j) * 0.5 + (i < 2 ? 0.5 : 0),
      );
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.customDepthMaterial = depth;
    mesh.userData.actorIndex = i;
    root.add(mesh);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 1.1),
      new THREE.MeshBasicMaterial({
        map: contactTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0.7,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(x, -2.68, z);
    root.add(shadow);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.57, 64),
      new THREE.MeshBasicMaterial({
        color: 0x555555,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(x, -2.66, z);
    root.add(halo);
    actors.push({
      mesh,
      home: new THREE.Vector3(x, y, z),
      velocity: new THREE.Vector3(),
      halo,
      shadow,
      tilt: 0,
    });
  });
  const ornaments: THREE.Mesh[] = [];
  const pearl = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.2,
    metalness: 0.2,
  });
  const silver = new THREE.MeshPhysicalMaterial({
    color: 0xb9b9b9,
    roughness: 0.13,
    metalness: 1,
  });
  for (let i = 0; i < 8; i++) {
    const star = new THREE.Shape();
    for (let p = 0; p < 10; p++) {
      const a = (p / 10) * Math.PI * 2,
        r = p % 2 ? 0.095 : 0.22;
      const x = Math.cos(a) * r,
        y = Math.sin(a) * r;
      p ? star.lineTo(x, y) : star.moveTo(x, y);
    }
    star.closePath();
    const geometry =
      i % 3 === 0
        ? new THREE.ExtrudeGeometry(star, {
            depth: 0.09,
            bevelEnabled: true,
            bevelSize: 0.02,
            bevelThickness: 0.02,
            bevelSegments: 2,
            steps: 1,
          })
        : i % 3 === 1
          ? new THREE.TorusGeometry(0.18, 0.035, 12, 40)
          : new THREE.BoxGeometry(0.26, 0.26, 0.26);
    const mesh = new THREE.Mesh(geometry, i % 2 ? pearl : silver);
    mesh.position.set(
      Math.cos(i * 2.4) * 5.2,
      Math.sin(i * 2.4) * 2.45 + 0.55,
      0.5 + Math.cos(i) * 1.5,
    );
    mesh.rotation.set(i * 0.3, i * 0.7, i * 0.8);
    root.add(mesh);
    ornaments.push(mesh);
  }
  const raycaster = new THREE.Raycaster(),
    pointer = new THREE.Vector2(9, 9),
    plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
    target = new THREE.Vector3(),
    dragOffset = new THREE.Vector3();
  let selected: Actor | undefined,
    hover = -1,
    keyboardIndex = 0,
    active = true,
    disposed = false,
    frame = 0,
    previous = 0,
    time = 0,
    interactiveUntil = 0,
    pointerId = -1;
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  let quiet = preference.matches;
  function render() {
    renderer.render(scene, camera);
  }
  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.position.set(
      0,
      0.9,
      Math.max(
        12,
        12 / (2 * Math.tan(THREE.MathUtils.degToRad(17)) * camera.aspect),
      ),
    );
    camera.lookAt(0, -0.05, 0);
    camera.updateProjectionMatrix();
    render();
  }
  function updatePointer(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    raycaster.ray.intersectPlane(plane, target);
  }
  function kick(actor: Actor) {
    actor.velocity.y += 8;
    actor.velocity.x += Math.sin(time * 4 + keyboardIndex) * 2;
    actor.tilt += 0.22;
    requestFrame();
  }
  function down(e: PointerEvent) {
    if (e.button !== 0) return;
    updatePointer(e);
    const hit = raycaster.intersectObjects(actors.map((a) => a.mesh))[0];
    if (!hit) return;
    selected = actors[hit.object.userData.actorIndex];
    keyboardIndex = actors.indexOf(selected);
    plane.constant = -selected.mesh.position.z;
    updatePointer(e);
    dragOffset.copy(selected.mesh.position).sub(target);
    pointerId = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
    canvas.focus({ preventScroll: true });
    selected.velocity.y += 1.5;
    requestFrame();
  }
  function move(e: PointerEvent) {
    updatePointer(e);
    if (!selected) {
      const hit = raycaster.intersectObjects(actors.map((a) => a.mesh))[0];
      hover = hit ? hit.object.userData.actorIndex : -1;
      canvas.style.cursor = hover >= 0 ? "grab" : "default";
    }
    requestFrame();
  }
  function release() {
    if (selected) {
      selected.velocity.y += 2.5;
      selected.tilt += 0.06;
      selected = undefined;
    }
    pointerId = -1;
    plane.constant = 0;
    canvas.style.cursor = hover >= 0 ? "grab" : "default";
    requestFrame();
  }
  function leave() {
    if (!selected) {
      pointer.set(9, 9);
      hover = -1;
      requestFrame();
    }
  }
  function keydown(e: KeyboardEvent) {
    if (
      ![
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        " ",
        "Enter",
      ].includes(e.key)
    )
      return;
    e.preventDefault();
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      keyboardIndex = (keyboardIndex + (e.key === "ArrowRight" ? 1 : 3)) % 4;
      hover = keyboardIndex;
      kick(actors[keyboardIndex]);
    } else if (e.key === " ") {
      actors.forEach(kick);
    } else kick(actors[keyboardIndex]);
    requestFrame();
  }
  function requestFrame() {
    interactiveUntil = performance.now() + 2500;
    if (active && !disposed && !frame) frame = requestAnimationFrame(tick);
  }
  function tick(now: number) {
    frame = 0;
    if (disposed || !active) return;
    const dt = Math.min(previous ? (now - previous) / 1000 : 1 / 60, 0.035);
    previous = now;
    time += dt;
    actors.forEach((actor, i) => {
      const destination =
        selected === actor ? target.clone().add(dragOffset) : actor.home;
      destination.x = THREE.MathUtils.clamp(destination.x, -5.7, 5.7);
      destination.y = THREE.MathUtils.clamp(destination.y, -1.3, 3.4);
      advanceSpring(
        actor.mesh.position,
        actor.velocity,
        destination,
        dt,
        selected === actor ? 95 : 28,
        selected === actor ? 14 : 6.5,
      );
      actor.tilt *= Math.exp(-4 * dt);
      actor.mesh.rotation.z =
        actor.tilt -
        actor.velocity.x * 0.023 +
        (!quiet ? Math.sin(time * 0.75 + i * 1.7) * 0.015 : 0);
      actor.mesh.rotation.y = pointer.x < 5 ? pointer.x * 0.06 : 0;
      actor.shadow.position.x = actor.halo.position.x = actor.mesh.position.x;
      actor.shadow.position.z = actor.halo.position.z = actor.mesh.position.z;
      actor.shadow.scale.setScalar(
        Math.max(0.5, 1 - (actor.mesh.position.y - actor.home.y) * 0.12),
      );
      (actor.shadow.material as THREE.MeshBasicMaterial).opacity =
        THREE.MathUtils.clamp(
          0.7 - (actor.mesh.position.y - actor.home.y) * 0.12,
          0.1,
          0.7,
        );
      const haloMaterial = actor.halo.material as THREE.MeshBasicMaterial;
      haloMaterial.opacity +=
        ((hover === i ? 0.6 : 0) - haloMaterial.opacity) * Math.min(1, dt * 8);
    });
    if (!quiet) {
      ornaments.forEach((mesh, i) => {
        mesh.rotation.y += dt * 0.32;
        mesh.position.y += Math.cos(time * 0.6 + i) * dt * 0.1;
      });
    }
    camera.position.x +=
      ((pointer.x < 5 ? pointer.x * 0.65 : 0) - camera.position.x) *
      Math.min(1, dt * 2.5);
    camera.position.y +=
      ((pointer.y < 5 ? 0.9 + pointer.y * 0.22 : 0.9) - camera.position.y) *
      Math.min(1, dt * 2.5);
    camera.lookAt(0, -0.05, 0);
    render();
    if (!quiet || selected || now < interactiveUntil)
      frame = requestAnimationFrame(tick);
  }
  function setActive(value: boolean) {
    active = value;
    previous = 0;
    if (!value) {
      cancelAnimationFrame(frame);
      frame = 0;
      selected = undefined;
      pointer.set(9, 9);
      hover = -1;
      if (pointerId >= 0 && canvas.hasPointerCapture(pointerId))
        canvas.releasePointerCapture(pointerId);
      pointerId = -1;
    } else requestFrame();
  }
  function motionChange() {
    quiet = preference.matches;
    requestFrame();
  }
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("lostpointercapture", release);
  canvas.addEventListener("pointerleave", leave);
  canvas.addEventListener("keydown", keydown);
  preference.addEventListener("change", motionChange);
  resize();
  requestFrame();
  return {
    resize,
    setActive,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", release);
      canvas.removeEventListener("pointercancel", release);
      canvas.removeEventListener("lostpointercapture", release);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("keydown", keydown);
      preference.removeEventListener("change", motionChange);
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          (Array.isArray(object.material)
            ? object.material
            : [object.material]
          ).forEach((m) => materials.add(m));
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      depth.dispose();
      atlas.dispose();
      contactTexture.dispose();
      environment.dispose();
      renderer.dispose();
    },
  };
}

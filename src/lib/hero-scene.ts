import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { RigidBody, World } from "@dimforge/rapier3d-compat";

export type HeroScene = {
  resize: () => void;
  setActive: (active: boolean) => void;
  dispose: () => void;
};
type Piece = { mesh: THREE.Group; body: RigidBody; home: THREE.Vector3 };

export async function createHeroScene(
  canvas: HTMLCanvasElement,
  variant: "chrome" | "matter",
  onReady: () => void,
): Promise<HeroScene> {
  const dark = variant === "matter";
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(
    Math.min(devicePixelRatio, innerWidth < 760 ? 1.5 : 2),
  );
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = dark ? 1.25 : 1.1;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
  camera.position.set(0, 0, dark ? 17 : 10);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, dark ? 0x444444 : 0x999999, 2));
  const key = new THREE.DirectionalLight(0xffffff, 5);
  key.position.set(-4, 7, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 3);
  rim.position.set(6, -1, 2);
  scene.add(rim);
  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xb8b8b8,
    metalness: 1,
    roughness: 0.13,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  });
  const ink = new THREE.MeshPhysicalMaterial({
    color: 0x121212,
    metalness: 0.15,
    roughness: 0.22,
    clearcoat: 1,
  });
  const porcelain = new THREE.MeshPhysicalMaterial({
    color: 0xf0f0f0,
    metalness: 0.05,
    roughness: 0.22,
    clearcoat: 1,
  });
  const root = new THREE.Group();
  scene.add(root);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(9, 9),
    last = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const target = new THREE.Vector3();
  const velocity = new THREE.Vector2();
  let held = false,
    selected: Piece | undefined,
    world: World | undefined;
  let active = true,
    disposed = false,
    frame = 0,
    time = 0,
    previous = 0,
    accumulator = 0;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let quiet = reduced.matches;
  const pieces: Piece[] = [];
  const pickables: THREE.Object3D[] = [];
  const knot = new THREE.Group();
  let cursorBody: RigidBody | undefined;
  let RAPIER: typeof import("@dimforge/rapier3d-compat").default | undefined;

  if (!dark) {
    const form = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.5, 0.48, 240, 40, 2, 3),
      chrome,
    );
    form.rotation.set(0.4, 0, -0.2);
    knot.add(form);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.77, 48, 32), ink);
    knot.add(core);
    for (let i = 0; i < 2; i++) {
      const orbit = new THREE.Mesh(
        new THREE.TorusGeometry(2.8 + i * 0.18, 0.013, 8, 180),
        i ? ink : chrome,
      );
      orbit.rotation.set(1.07 + i * 0.6, i * 0.7, -0.35);
      knot.add(orbit);
    }
    const bead = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 24, 16),
      porcelain,
    );
    bead.position.set(2.7, 0.3, 0.6);
    knot.add(bead);
    root.add(knot);
    pickables.push(form, core);
  } else {
    RAPIER = (await import("@dimforge/rapier3d-compat")).default;
    await RAPIER.init();
    world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    world.timestep = 1 / 60;
    const count = innerWidth < 760 ? 12 : 20;
    const cube = new RoundedBoxGeometry(1.13, 1.13, 1.13, 3, 0.15);
    const ring = new THREE.TorusGeometry(0.61, 0.23, 20, 64);
    const capsule = new THREE.CapsuleGeometry(0.25, 1.2, 8, 20);
    for (let i = 0; i < count; i++) {
      const group = new THREE.Group();
      const material = [porcelain, chrome, ink][i % 3];
      if (i % 3 === 0) {
        for (let axis = 0; axis < 3; axis++) {
          const arm = new THREE.Mesh(capsule, material);
          if (axis === 1) arm.rotation.z = Math.PI / 2;
          if (axis === 2) arm.rotation.x = Math.PI / 2;
          group.add(arm);
        }
      } else group.add(new THREE.Mesh(i % 3 === 1 ? ring : cube, material));
      const angle = i * 2.39996;
      const radius = 1.05 * Math.sqrt(i + 0.5);
      const home = new THREE.Vector3(
        Math.cos(angle) * radius * 1.35,
        Math.sin(angle) * radius * 0.7,
        Math.sin(i * 3.7) * 0.9,
      );
      if (innerWidth < 760) {
        home.x *= 0.58;
        home.y *= 1.4;
      }
      const q = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(i * 0.83, i * 0.41, i * 0.62),
      );
      const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(home.x, home.y, home.z)
          .setRotation(q)
          .setLinearDamping(1.4)
          .setAngularDamping(1.1)
          .setCcdEnabled(true),
      );
      if (i % 3 === 0) {
        for (let axis = 0; axis < 3; axis++) {
          const collider = RAPIER.ColliderDesc.capsule(0.6, 0.25)
            .setRestitution(0.55)
            .setFriction(0.2);
          if (axis)
            collider.setRotation(
              new THREE.Quaternion().setFromAxisAngle(
                axis === 1
                  ? new THREE.Vector3(0, 0, 1)
                  : new THREE.Vector3(1, 0, 0),
                Math.PI / 2,
              ),
            );
          world.createCollider(collider, body);
        }
      } else if (i % 3 === 1) {
        // Compound spheres leave the centre hole open for real ring contact.
        for (let j = 0; j < 12; j++) {
          const a = (j / 12) * Math.PI * 2;
          world.createCollider(
            RAPIER.ColliderDesc.ball(0.24)
              .setTranslation(Math.cos(a) * 0.61, Math.sin(a) * 0.61, 0)
              .setRestitution(0.5),
            body,
          );
        }
      } else
        world.createCollider(
          RAPIER.ColliderDesc.roundCuboid(
            0.42,
            0.42,
            0.42,
            0.15,
          ).setRestitution(0.55),
          body,
        );
      group.userData.pieceIndex = i;
      root.add(group);
      pickables.push(...group.children);
      pieces.push({ mesh: group, body, home });
    }
    cursorBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(30, 30, 0),
    );
    world.createCollider(
      RAPIER.ColliderDesc.ball(0.42).setRestitution(0.5),
      cursorBody,
    );
    pieces.forEach(({ body, mesh }) => {
      mesh.position.copy(body.translation());
      mesh.quaternion.copy(body.rotation());
    });
  }

  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.position.z = dark
      ? camera.aspect < 1
        ? 21
        : 17
      : camera.aspect < 1
        ? 16
        : 10;
    camera.updateProjectionMatrix();
    render();
  }
  function render() {
    renderer.render(scene, camera);
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
  function down(e: PointerEvent) {
    if (e.button !== 0) return;
    updatePointer(e);
    const hit = raycaster.intersectObjects(pickables)[0];
    if (!hit) return;
    held = true;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
    last.set(e.clientX, e.clientY);
    canvas.focus({ preventScroll: true });
    if (dark) {
      selected = pieces[hit.object.parent!.userData.pieceIndex];
      plane.constant = -selected.body.translation().z;
      updatePointer(e);
      cursorBody?.setNextKinematicTranslation({ x: 30, y: 30, z: 0 });
    }
    requestFrame();
  }
  function move(e: PointerEvent) {
    updatePointer(e);
    if (held && !dark) {
      velocity.x += (e.clientX - last.x) * 0.002;
      velocity.y += (e.clientY - last.y) * 0.002;
      last.set(e.clientX, e.clientY);
    }
    if (!held)
      canvas.style.cursor = raycaster.intersectObjects(pickables).length
        ? "grab"
        : "default";
    requestFrame();
  }
  function release() {
    held = false;
    selected = undefined;
    plane.constant = 0;
    canvas.style.cursor = "grab";
    requestFrame();
  }
  function leave() {
    if (!held) {
      pointer.set(9, 9);
      cursorBody?.setNextKinematicTranslation({ x: 30, y: 30, z: 0 });
    }
  }
  function keydown(e: KeyboardEvent) {
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)
    )
      return;
    e.preventDefault();
    if (!dark) {
      velocity.x += e.key === "ArrowLeft" ? -0.08 : 0.08;
      velocity.y +=
        e.key === "ArrowUp" ? -0.05 : e.key === "ArrowDown" ? 0.05 : 0;
    } else
      pieces.forEach(({ body }, i) =>
        body.applyImpulse(
          { x: Math.cos(i * 2.4) * 4, y: Math.sin(i * 2.4) * 4, z: 1 },
          true,
        ),
      );
    requestFrame();
  }
  function stepPhysics() {
    if (!world) return;
    pieces.forEach(({ body, home }, i) => {
      const p = body.translation(),
        v = body.linvel(),
        destination = selected?.body === body ? target : home;
      const strength = selected?.body === body ? 32 : 2.2;
      const damping = selected?.body === body ? 7 : 0.4;
      body.resetForces(true);
      body.resetTorques(true);
      const force = new THREE.Vector3(
        destination.x - p.x,
        destination.y - p.y,
        destination.z - p.z,
      )
        .multiplyScalar(strength)
        .addScaledVector(new THREE.Vector3(v.x, v.y, v.z), -damping)
        .clampLength(0, 65);
      body.addForce(force, true);
      if (!quiet && !selected)
        body.addTorque(
          { x: Math.sin(time * 0.5 + i) * 0.07, y: 0.055, z: 0.025 },
          true,
        );
    });
    if (!held && pointer.x < 5)
      cursorBody?.setNextKinematicTranslation({
        x: target.x,
        y: target.y,
        z: 0,
      });
    world.step();
    pieces.forEach(({ body, mesh }) => {
      mesh.position.copy(body.translation());
      mesh.quaternion.copy(body.rotation());
    });
  }
  let interactiveUntil = 0;
  function requestFrame() {
    interactiveUntil = performance.now() + 2000;
    if (!frame && active && !disposed) frame = requestAnimationFrame(tick);
  }
  function tick(now: number) {
    frame = 0;
    if (disposed || !active) return;
    const dt = Math.min(previous ? (now - previous) / 1000 : 1 / 60, 0.05);
    previous = now;
    time += dt;
    if (dark) {
      accumulator += dt;
      while (accumulator >= 1 / 60) {
        stepPhysics();
        accumulator -= 1 / 60;
      }
    } else {
      const damping = Math.exp(-3.5 * dt);
      velocity.multiplyScalar(damping);
      knot.rotation.y +=
        velocity.x * dt * 60 + (!quiet && !held ? dt * 0.1 : 0);
      knot.rotation.x += velocity.y * dt * 60;
      if (!quiet && !held) {
        knot.rotation.x +=
          (pointer.y < 5
            ? -pointer.y * 0.18 - knot.rotation.x
            : -knot.rotation.x) * Math.min(1, dt * 1.5);
        knot.position.y = Math.sin(time * 0.8) * 0.08;
      }
    }
    camera.position.x +=
      ((pointer.x < 5 ? pointer.x * 0.25 : 0) - camera.position.x) *
      Math.min(1, dt * 2);
    camera.lookAt(0, 0, 0);
    render();
    if (!quiet || held || now < interactiveUntil)
      frame = requestAnimationFrame(tick);
  }
  function setActive(value: boolean) {
    active = value;
    previous = 0;
    if (!value) {
      cancelAnimationFrame(frame);
      frame = 0;
      release();
    } else requestFrame();
  }
  function motionChange() {
    quiet = reduced.matches;
    requestFrame();
  }
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("lostpointercapture", release);
  canvas.addEventListener("pointerleave", leave);
  canvas.addEventListener("keydown", keydown);
  reduced.addEventListener("change", motionChange);
  resize();
  onReady();
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
      reduced.removeEventListener("change", motionChange);
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material])
            materials.add(material);
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      chrome.dispose();
      ink.dispose();
      porcelain.dispose();
      environment.dispose();
      world?.free();
      renderer.dispose();
    },
  };
}

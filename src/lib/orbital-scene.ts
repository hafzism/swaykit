import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { advanceSpring } from "./spring-motion";
import { orbitalObjects } from "./orbital-data";
import type { HeroScene } from "./hero-scene";

export type OrbitalScene = HeroScene & {
  pulse: () => void;
  reset: () => void;
  select: (index: number) => void;
};
type Node = {
  group: THREE.Group;
  offset: THREE.Vector3;
  velocity: THREE.Vector3;
  base: THREE.Vector3;
  radius: number;
  phase: number;
  halo: THREE.Mesh;
  label: THREE.Sprite;
};
const TAU = Math.PI * 2;
const diskVertex = `varying vec2 vPosition; void main(){vPosition=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const diskFragment = `
uniform float uTime; uniform float uPulse; varying vec2 vPosition;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float n=0.,w=.5;for(int i=0;i<4;i++){n+=w*noise(p);p=p*2.03+17.1;w*=.5;}return n;}
void main(){float r=length(vPosition);float a=atan(vPosition.y,vPosition.x);float grain=fbm(vec2(a*7.-uTime*.22+r*3.,r*18.-uTime*.1));float bands=.5+.5*sin(r*108.+grain*8.-a*5.);float edge=smoothstep(1.17,1.3,r)*(1.-smoothstep(2.2,2.65,r));float innerDelta=(r-1.3)/.085;float inner=exp(-innerDelta*innerDelta);float streak=pow(max(0.,.5+.5*sin(a*13.-r*23.+uTime*.3)),14.);float light=(.1+grain*.7+bands*.28+streak*.22)*edge+inner*1.2;light*=1.+uPulse*.7;gl_FragColor=vec4(vec3(light*1.45),edge*.92);}`;
const coreVertex = `varying vec3 vNormal;varying vec3 vView;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`;
const coreFragment = `varying vec3 vNormal;varying vec3 vView;void main(){float edge=pow(max(0.,1.-abs(dot(normalize(vNormal),normalize(vView)))),4.);gl_FragColor=vec4(vec3(.002+edge*.8),1.);}`;
const starVertex = `attribute float aSize;varying float vSize;uniform float uTime;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vSize=aSize;gl_PointSize=clamp(aSize*120./-p.z,.8,3.5);gl_Position=projectionMatrix*p;}`;
const starFragment = `varying float vSize;uniform float uTime;void main(){float d=length(gl_PointCoord-.5);float alpha=(1.-smoothstep(.1,.5,d))*(.42+.28*sin(vSize*7.+uTime*.35));gl_FragColor=vec4(vec3(1.15),alpha);}`;

export async function createOrbitalScene(
  canvas: HTMLCanvasElement,
  onSelect: (index: number) => void,
): Promise<OrbitalScene> {
  const mobile = canvas.getBoundingClientRect().width < 700;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.2 : 1.6));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050506);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const cluster = new THREE.Group();
  scene.add(cluster);
  const environmentScene = new RoomEnvironment(),
    pmrem = new THREE.PMREMGenerator(renderer),
    environment = pmrem.fromScene(environmentScene, 0.04);
  scene.environment = environment.texture;
  environmentScene.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x111111, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 3);
  key.position.set(-3, 5, 7);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.8);
  rim.position.set(6, -3, 2);
  scene.add(rim);
  const centreLight = new THREE.PointLight(0xffffff, 10, 13, 2);
  cluster.add(centreLight);
  const metal = new THREE.MeshStandardMaterial({
    color: 0xc0c0c0,
    metalness: 1,
    roughness: 0.18,
  });
  const porcelain = new THREE.MeshStandardMaterial({
    color: 0xe8e8e8,
    metalness: 0.15,
    roughness: 0.35,
  });
  const black = new THREE.MeshStandardMaterial({
    color: 0x161616,
    metalness: 0.5,
    roughness: 0.3,
  });
  const led = new THREE.MeshBasicMaterial({
    color: new THREE.Color(3, 3, 3),
    toneMapped: false,
  });
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x777777,
    transparent: true,
    opacity: 0.26,
  });
  const textures: THREE.Texture[] = [];
  let seed = 421;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(1.19, 64, 48),
    new THREE.ShaderMaterial({
      vertexShader: coreVertex,
      fragmentShader: coreFragment,
    }),
  );
  cluster.add(core);
  core.userData.objectIndex = 0;
  const diskMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPulse: { value: 0 } },
    vertexShader: diskVertex,
    fragmentShader: diskFragment,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const disk = new THREE.Mesh(
    new THREE.RingGeometry(1.18, 2.65, 200, 24),
    diskMaterial,
  );
  disk.rotation.set(-0.6, 0.08, 0.26);
  cluster.add(disk);
  const photon = new THREE.Mesh(
    new THREE.TorusGeometry(1.215, 0.012, 8, 180),
    led,
  );
  cluster.add(photon);
  const lens = new THREE.Mesh(
    new THREE.TorusGeometry(1.34, 0.008, 8, 180),
    new THREE.MeshBasicMaterial({
      color: 0x777777,
      transparent: true,
      opacity: 0.28,
    }),
  );
  lens.rotation.x = 0.18;
  cluster.add(lens);
  const wave = new THREE.Mesh(
    new THREE.RingGeometry(1.25, 1.275, 180),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(2, 2, 2),
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  cluster.add(wave);

  const starCount = mobile ? 420 : 950;
  const starPositions = new Float32Array(starCount * 3),
    starSizes = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    starPositions.set(
      [(random() - 0.5) * 65, (random() - 0.5) * 40, -10 - random() * 40],
      i * 3,
    );
    starSizes[i] = 0.45 + random() * 1.7;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(starPositions, 3),
  );
  starGeometry.setAttribute("aSize", new THREE.BufferAttribute(starSizes, 1));
  const starMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: starVertex,
    fragmentShader: starFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);

  const asteroidCount = mobile ? 120 : 260;
  const asteroids = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.055, 0),
    metal,
    asteroidCount,
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < asteroidCount; i++) {
    const a = random() * TAU,
      r = 3.03 + random() * 0.58;
    dummy.position.set(
      Math.cos(a) * r,
      Math.sin(a) * r,
      (random() - 0.5) * 0.2,
    );
    dummy.rotation.set(random() * 3, random() * 3, random() * 3);
    dummy.scale.setScalar(0.35 + random() * 1.1);
    dummy.updateMatrix();
    asteroids.setMatrixAt(i, dummy.matrix);
  }
  asteroids.rotation.set(1.06, 0.08, -0.12);
  cluster.add(asteroids);
  const nodes: Node[] = [],
    pickables: THREE.Object3D[] = [core];
  function add(
    group: THREE.Group,
    geometry: THREE.BufferGeometry,
    material: THREE.Material = metal,
    position?: THREE.Vector3,
  ) {
    const mesh = new THREE.Mesh(geometry, material);
    if (position) mesh.position.copy(position);
    group.add(mesh);
    return mesh;
  }
  function label(text: string) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 48;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#c7c7c7";
    ctx.font = "17px monospace";
    ctx.textAlign = "center";
    ctx.fillText(text, 128, 29);
    const texture = new THREE.CanvasTexture(c);
    textures.push(texture);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    sprite.scale.set(1.7, 0.32, 1);
    sprite.position.y = -0.95;
    return sprite;
  }
  function moonTexture() {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#aaa";
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 850; i++) {
      const x = random() * 512,
        y = random() * 256,
        r = 1 + random() * 10;
      const g = ctx.createRadialGradient(
        x - r * 0.15,
        y - r * 0.15,
        0,
        x,
        y,
        r,
      );
      g.addColorStop(0, "#666");
      g.addColorStop(0.7, "#999");
      g.addColorStop(1, "#c4c4c4");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.push(texture);
    return texture;
  }
  const moon = moonTexture();
  for (let i = 0; i < 8; i++) {
    const group = new THREE.Group();
    if (i === 0) {
      add(
        group,
        new THREE.SphereGeometry(0.56, 40, 28),
        new THREE.MeshStandardMaterial({
          map: moon,
          bumpMap: moon,
          bumpScale: 0.06,
          roughness: 0.9,
        }),
      );
    }
    if (i === 1) {
      add(group, new THREE.SphereGeometry(0.49, 36, 24), porcelain);
      const ring = add(
        group,
        new THREE.RingGeometry(0.65, 1.03, 96),
        new THREE.MeshStandardMaterial({
          color: 0x919191,
          metalness: 0.7,
          roughness: 0.3,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        }),
      );
      ring.rotation.set(0.6, -0.15, 0.12);
      for (let r = 0.68; r < 1.05; r += 0.06) {
        const rim = add(group, new THREE.TorusGeometry(r, 0.008, 4, 70), black);
        rim.rotation.copy(ring.rotation);
      }
    }
    if (i === 2) {
      add(group, new THREE.OctahedronGeometry(0.7, 0), metal);
      const skeleton = add(
        group,
        new THREE.OctahedronGeometry(0.77, 0),
        new THREE.MeshBasicMaterial({ color: 0xcccccc, wireframe: true }),
      );
      skeleton.rotation.z = 0.08;
    }
    if (i === 3) {
      add(group, new RoundedBoxGeometry(0.48, 0.48, 0.5, 2, 0.045), porcelain);
      for (const side of [-1, 1]) {
        add(
          group,
          new THREE.BoxGeometry(0.7, 0.42, 0.04),
          black,
          new THREE.Vector3(side * 0.65, 0, 0),
        );
        for (let g = 0; g < 4; g++)
          add(
            group,
            new THREE.BoxGeometry(0.009, 0.41, 0.045),
            metal,
            new THREE.Vector3(side * (0.33 + g * 0.18), 0, 0.025),
          );
      }
      const dish = add(
        group,
        new THREE.ConeGeometry(0.2, 0.12, 24, 1, true),
        metal,
        new THREE.Vector3(0, 0.4, 0),
      );
      dish.rotation.z = 0.3;
      add(
        group,
        new THREE.SphereGeometry(0.035, 8, 8),
        led,
        new THREE.Vector3(0, 0.55, 0),
      );
    }
    if (i === 4) {
      const ring = add(
        group,
        new THREE.TorusGeometry(0.51, 0.09, 16, 70),
        black,
      );
      ring.rotation.y = 0.2;
      const light = add(
        group,
        new THREE.TorusGeometry(0.51, 0.018, 8, 70),
        led,
      );
      light.position.z = 0.08;
      add(group, new THREE.SphereGeometry(0.1, 16, 12), metal);
    }
    if (i === 5) {
      for (let axis = 0; axis < 3; axis++) {
        const ring = add(
          group,
          new THREE.TorusGeometry(0.53 - axis * 0.05, 0.035, 12, 60),
          axis === 1 ? porcelain : metal,
        );
        ring.rotation.set(
          (axis * Math.PI) / 2,
          axis === 2 ? Math.PI / 2 : 0,
          0.3,
        );
      }
      add(group, new THREE.SphereGeometry(0.18, 20, 16), led);
    }
    if (i === 6) {
      const geometry = new THREE.BoxGeometry(0.83, 0.83, 0.83);
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color: 0xaaaaaa }),
      );
      geometry.dispose();
      group.add(edges);
      add(group, new RoundedBoxGeometry(0.47, 0.47, 0.47, 2, 0.03), black);
      add(
        group,
        new THREE.SphereGeometry(0.08, 12, 12),
        led,
        new THREE.Vector3(0.43, 0.43, 0.43),
      );
    }
    if (i === 7) {
      const points = [];
      for (let j = 0; j <= 100; j++) {
        const a = (j / 100) * TAU * 2.8;
        points.push(
          new THREE.Vector3(
            Math.cos(a) * 0.35,
            (j / 100) * 1.45 - 0.725,
            Math.sin(a) * 0.35,
          ),
        );
      }
      add(
        group,
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          100,
          0.047,
          8,
          false,
        ),
        metal,
      );
      add(
        group,
        new THREE.CylinderGeometry(0.42, 0.42, 0.05, 32),
        black,
        new THREE.Vector3(0, -0.76, 0),
      );
      add(
        group,
        new THREE.CylinderGeometry(0.42, 0.42, 0.05, 32),
        porcelain,
        new THREE.Vector3(0, 0.76, 0),
      );
    }
    group.rotation.set(i * 0.3, i * 0.5, i * 0.22);
    group.traverse((object) => {
      object.userData.objectIndex = i + 1;
      if (object instanceof THREE.Mesh) pickables.push(object);
    });
    const halo = add(
      group,
      new THREE.TorusGeometry(0.94, 0.006, 8, 80),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(1.8, 1.8, 1.8),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    const tag = label(
      `0${i + 1} / ${orbitalObjects[i + 1].name.toUpperCase()}`,
    );
    group.add(tag);
    const radius = 3.6 + (i % 3) * 0.68,
      phase = (i / 8) * TAU + 0.18;
    const node = {
      group,
      offset: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      base: new THREE.Vector3(),
      radius,
      phase,
      halo,
      label: tag,
    };
    nodes.push(node);
    cluster.add(group);
    const path = [];
    for (let p = 0; p <= 180; p++) {
      const a = (p / 180) * TAU;
      path.push(
        new THREE.Vector3(
          Math.cos(a) * radius,
          Math.sin(a) * radius * 0.61,
          Math.sin(a + i * 0.6) * 0.65,
        ),
      );
    }
    cluster.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(path),
        lineMaterial,
      ),
    );
  }
  const composer = new EffectComposer(renderer),
    renderPass = new RenderPass(scene, camera),
    bloom = new UnrealBloomPass(new THREE.Vector2(800, 500), 0.2, 0.25, 1.8),
    output = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(output);
  const pointer = new THREE.Vector2(9, 9),
    raycaster = new THREE.Raycaster(),
    last = new THREE.Vector2(),
    start = new THREE.Vector2();
  const angle = new THREE.Vector3(-0.12, 0.08, -0.17),
    angleVelocity = new THREE.Vector3(),
    angleTarget = angle.clone();
  let active = true,
    disposed = false,
    frame = 0,
    previous = 0,
    time = 0,
    held = false,
    capture = -1,
    selected = 0,
    hover = -1,
    pulseEnergy = 0,
    waveAge = 8,
    interactiveUntil = 0,
    zoom = 1,
    zoomTarget = 1,
    cameraDistance = 16;
  let initialized = false;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let quiet = reduced.matches;
  const origin = new THREE.Vector3(),
    focus = new THREE.Vector3();
  function place() {
    nodes.forEach((node, i) => {
      const a = node.phase + time * (0.04 + i * 0.003);
      node.base.set(
        Math.cos(a) * node.radius,
        Math.sin(a) * node.radius * 0.61,
        Math.sin(a + i * 0.6) * 0.65,
      );
      node.group.position.copy(node.base).add(node.offset);
    });
  }
  function render() {
    composer.render();
  }
  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = width / Math.max(1, height);
    cameraDistance = Math.max(
      16,
      12.3 / (2 * Math.tan(THREE.MathUtils.degToRad(19)) * camera.aspect),
    );
    camera.position.set(0, 0.4, cameraDistance * zoom);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    place();
    cluster.rotation.set(angle.x, angle.y, angle.z);
    if (initialized) render();
  }
  function requestFrame() {
    interactiveUntil = performance.now() + 3000;
    if (active && !disposed && !frame) frame = requestAnimationFrame(tick);
  }
  function select(index: number) {
    selected = THREE.MathUtils.clamp(Math.trunc(index), 0, 8);
    onSelect(selected);
    zoomTarget = selected ? 0.94 : 1;
    requestFrame();
  }
  function pulse() {
    pulseEnergy = 1;
    waveAge = 0;
    nodes.forEach((node, i) => {
      node.velocity
        .copy(node.base)
        .normalize()
        .multiplyScalar(5.5 + i * 0.25);
      node.velocity.z += Math.sin(i * 2.4) * 2;
    });
    requestFrame();
  }
  function reset() {
    angleTarget.set(-0.12, 0.08, -0.17);
    angleVelocity.set(0, 0, 0);
    nodes.forEach((n) => {
      n.offset.set(0, 0, 0);
      n.velocity.set(0, 0, 0);
    });
    pulseEnergy = 0;
    waveAge = 8;
    zoomTarget = 1;
    select(0);
    requestFrame();
  }
  function updatePointer(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
  }
  function hitIndex() {
    const hit = raycaster.intersectObjects(pickables, false)[0];
    return hit ? (hit.object.userData.objectIndex as number) : -1;
  }
  function down(e: PointerEvent) {
    if (e.button !== 0) return;
    updatePointer(e);
    held = true;
    capture = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    last.set(e.clientX, e.clientY);
    start.copy(last);
    canvas.style.cursor = "grabbing";
    canvas.focus({ preventScroll: true });
    requestFrame();
  }
  function move(e: PointerEvent) {
    updatePointer(e);
    if (held) {
      const dx = e.clientX - last.x,
        dy = e.clientY - last.y;
      angleTarget.y += dx * 0.004;
      angleTarget.x = THREE.MathUtils.clamp(
        angleTarget.x + dy * 0.004,
        -0.9,
        0.9,
      );
      angleVelocity.y = dx * 0.03;
      angleVelocity.x = dy * 0.03;
      last.set(e.clientX, e.clientY);
    } else {
      hover = hitIndex();
      canvas.style.cursor = hover >= 0 ? "pointer" : "grab";
    }
    requestFrame();
  }
  function up(e: PointerEvent) {
    if (!held) return;
    held = false;
    if (start.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) < 7) {
      updatePointer(e);
      const index = hitIndex();
      if (index >= 0) {
        select(index);
        if (index === 0) pulse();
        else {
          nodes[index - 1].velocity
            .copy(nodes[index - 1].base)
            .normalize()
            .multiplyScalar(2.4);
          waveAge = 0;
          pulseEnergy = 0.35;
        }
      } else pulse();
    }
    capture = -1;
    canvas.style.cursor = "grab";
    requestFrame();
  }
  function cancel() {
    held = false;
    capture = -1;
    canvas.style.cursor = "grab";
    requestFrame();
  }
  function leave() {
    if (!held) {
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
        "Enter",
        " ",
        "Escape",
        "+",
        "-",
      ].includes(e.key)
    )
      return;
    e.preventDefault();
    if (e.key === " ") pulse();
    else if (e.key === "Escape") reset();
    else if (e.key === "Enter") select((selected + 1) % 9);
    else if (e.key === "+") zoomTarget = Math.max(0.7, zoomTarget - 0.08);
    else if (e.key === "-") zoomTarget = Math.min(1.3, zoomTarget + 0.08);
    else {
      angleTarget.y +=
        e.key === "ArrowLeft" ? -0.17 : e.key === "ArrowRight" ? 0.17 : 0;
      angleTarget.x = THREE.MathUtils.clamp(
        angleTarget.x +
          (e.key === "ArrowUp" ? -0.12 : e.key === "ArrowDown" ? 0.12 : 0),
        -0.9,
        0.9,
      );
    }
    requestFrame();
  }
  function tick(now: number) {
    frame = 0;
    if (!active || disposed) return;
    if (previous && now - previous < 1000 / (mobile ? 24 : 30)) {
      frame = requestAnimationFrame(tick);
      return;
    }
    const dt = Math.min(previous ? (now - previous) / 1000 : 1 / 30, 0.05);
    previous = now;
    if (!quiet) time += dt;
    if (!held) {
      angleTarget.y += angleVelocity.y * dt;
      angleTarget.x = THREE.MathUtils.clamp(
        angleTarget.x + angleVelocity.x * dt,
        -0.9,
        0.9,
      );
      angleVelocity.multiplyScalar(Math.exp(-4 * dt));
    }
    angle.lerp(angleTarget, 1 - Math.exp(-5 * dt));
    cluster.rotation.set(angle.x, angle.y, angle.z);
    pulseEnergy *= Math.exp(-2.1 * dt);
    waveAge += dt;
    diskMaterial.uniforms.uTime.value = time;
    diskMaterial.uniforms.uPulse.value = pulseEnergy;
    starMaterial.uniforms.uTime.value = time;
    wave.scale.setScalar(1 + Math.min(1, waveAge / 1.5) * 4.4);
    (wave.material as THREE.MeshBasicMaterial).opacity = Math.max(
      0,
      0.45 * (1 - waveAge / 1.5),
    );
    nodes.forEach((node, i) => {
      advanceSpring(node.offset, node.velocity, origin, dt, 8, 2.5, 10);
      const s = selected === i + 1 ? 1.28 : hover === i + 1 ? 1.12 : 1;
      node.group.scale.lerp(new THREE.Vector3(s, s, s), 1 - Math.exp(-5 * dt));
      if (!quiet) node.group.rotation.y += dt * (0.1 + i * 0.01);
      const haloMaterial = node.halo.material as THREE.MeshBasicMaterial;
      haloMaterial.opacity +=
        ((selected === i + 1 ? 0.72 : hover === i + 1 ? 0.3 : 0) -
          haloMaterial.opacity) *
        (1 - Math.exp(-6 * dt));
      node.label.material.opacity = selected === i + 1 ? 1 : 0.48;
    });
    place();
    if (!quiet) {
      asteroids.rotation.z += dt * 0.035;
      stars.rotation.z += dt * 0.002;
    }
    if (selected) {
      nodes[selected - 1].group.getWorldPosition(focus);
      focus.multiplyScalar(0.13);
    } else focus.set(0, 0, 0);
    zoom += (zoomTarget - zoom) * (1 - Math.exp(-4 * dt));
    camera.position.x +=
      ((pointer.x < 5 ? pointer.x * 0.48 : 0) - camera.position.x) *
      (1 - Math.exp(-2 * dt));
    camera.position.y +=
      ((pointer.y < 5 ? 0.4 + pointer.y * 0.35 : 0.4) - camera.position.y) *
      (1 - Math.exp(-2 * dt));
    camera.position.z +=
      (cameraDistance * zoom - camera.position.z) * (1 - Math.exp(-4 * dt));
    camera.lookAt(focus);
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
      held = false;
      pointer.set(9, 9);
      if (capture >= 0 && canvas.hasPointerCapture(capture))
        canvas.releasePointerCapture(capture);
      capture = -1;
    } else requestFrame();
  }
  function motionChange() {
    quiet = reduced.matches;
    requestFrame();
  }
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", cancel);
  canvas.addEventListener("lostpointercapture", cancel);
  canvas.addEventListener("pointerleave", leave);
  canvas.addEventListener("keydown", keydown);
  reduced.addEventListener("change", motionChange);
  // Prime the programs, but draw the first frame synchronously: hidden previews
  // throttle animation callbacks and cannot be relied on to produce a poster.
  void renderer.compileAsync(scene, camera);
  initialized = true;
  resize();
  requestFrame();
  return {
    resize,
    setActive,
    pulse,
    reset,
    select,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("lostpointercapture", cancel);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("keydown", keydown);
      reduced.removeEventListener("change", motionChange);
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (
          object instanceof THREE.Mesh ||
          object instanceof THREE.Line ||
          object instanceof THREE.Points ||
          object instanceof THREE.Sprite
        ) {
          if ("geometry" in object) geometries.add(object.geometry);
          (Array.isArray(object.material)
            ? object.material
            : [object.material]
          ).forEach((m) => materials.add(m));
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      environment.dispose();
      bloom.dispose();
      output.dispose();
      renderPass.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}

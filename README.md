# SwayKit

A monochrome, motion-led React component library with a working Kinetic Type playground.

## Run locally

Requires Node.js 20.9 or newer.

```sh
npm install
npm run dev
```

Open http://localhost:3000. The site includes a homepage, searchable catalog, component playground, and getting-started documentation.

## Verify and build

```sh
npm run typecheck
npm run verify
npm run build
```

The build exports the entire site to `out/`. There are no runtime functions, database, authentication service, or AI API calls. Fonts are bundled locally. Preview configuration, local saves, share links, and prompt generation run in the browser.

## Deploy to Vercel

Import this repository into Vercel using its Next.js preset. Build command: `npm run build`. The static export is handled by Next.js. The registry install command automatically uses the visited domain after deployment. For another static host, publish `out/`.

Vercel Hobby is intended for personal, non-commercial projects and is subject to usage limits: https://vercel.com/docs/plans/hobby.

## Demo component

`src/registry/kinetic-type.tsx` is the standalone source used by the actual preview, code exports, and generated registry. It requires `gsap` and `@gsap/react` only. It uses inline styles, inherits the consuming project's font and text colour, and scales the font down for narrow containers using container query units; `size` is the maximum font size.

The playground supports text, font, maximum font size, animation duration, character delay, reveal distance, outline, four presets, replay, device viewports, preview themes, fullscreen, local saving, and share links. Usage and AI prompt exports reflect the current settings. The AI prompt includes the complete source.

Save is local to the current browser. Share links contain configuration in their URL. Preview device widths are capped by the available stage width on smaller screens; fullscreen provides more space.

## Project structure

- `src/app/`: static routes and global styles.
- `src/components/Home.tsx`: homepage GSAP timelines and ScrollTrigger choreography.
- `src/components/Playground.tsx`: controls, source/code/prompt exports, saving, and sharing.
- `src/components/Preview.tsx`: isolated iframe preview with same-origin message validation.
- `src/lib/catalog.ts`: component metadata, defaults, presets, configuration parsing, and usage generation.
- `src/registry/`: portable component source.
- `scripts/build-registry.mjs`: generates registry and copyable source assets from that source.
- `public/r/kinetic-type.json`: generated shadcn registry item.

Choose the engine per component: CSS/SVG for simpler effects, Motion or GSAP for animation, and Three.js or shaders when a component needs them. Add only the dependencies actually used and include them in that component’s registry and code exports.

When adding another component, add its portable source, metadata, defaults, controls, presets, static component route, preview renderer, and registry entry. The first release implements these for Kinetic Type; a multi-component control-schema abstraction can follow as the second component establishes what needs to be shared.

## Design research

See [docs/design-research.md](docs/design-research.md) for references, observations, and implementation decisions.

## Hero concepts

The homepage stacks five design directions. The first two are Chrome Study (drag to rotate with damped inertia) and Kinetic Matter (Rapier rigid-body collisions and force-based dragging). `src/components/HeroExperiments.tsx` handles their visibility, loading states, and scene lifecycle; `src/lib/hero-scene.ts` contains their Three.js rendering and physics runtime. The second scene loads Rapier on demand. All concepts render entirely in the browser and export as static pages for Vercel.

Drag the sculpture or pieces with a pointer. When the canvas has focus, arrow keys turn the sculpture or scatter the pieces; space scatters the physics scene. Reduced-motion preferences stop automatic movement. A CSS artwork fallback remains if WebGL cannot start.

## Little World (third hero)

The third hero combines original 3D-rendered collectible character artwork with live Three.js extruded lettering, lighting, ground shadows, parallax, and draggable spring movement. The characters are rendered sprites placed at different depths, rather than rigged 3D character models; the lettering, floor, and floating ornaments are real geometry. Dragging, releasing, and keyboard jumps remain interactive. Arrow keys choose a character, Enter makes it jump, and Space makes everyone jump.

The scene and its 2.1 MB atlas load when the section becomes visible. Hidden scenes stop rendering; reduced motion stops idle animation. `src/lib/spring-motion.ts` integrates movement in small substeps, with checks for settling, consistency at 30/60/120 fps, and bounded drag velocity.

Selected artwork: `public/art/toy-world.png`. Generation prompts and the original ink study are documented in `docs/image-prompts.md`. The bundled Helvetiker font is from the Three.js examples; its license is retained at `public/art/font-license.txt`. All production assets remain local, with no runtime image-generation service or external texture request.

## Orbital Observatory (fourth hero)

The fourth concept is a fully procedural 3D universe. Its core has a custom animated accretion shader, a dark sphere and photon ring. Eight distinct orbital objects surround it, alongside an instanced asteroid belt, a depth-layered star field, orbital paths, selection halos, and restrained bloom. Crater textures, labels, materials, and lighting are generated locally; this scene downloads no image or model assets.

Drag to rotate with inertia. Tap an object or use Discover to select it. Tap the core, press Space, or use Scatter to send the orbitals outward; damped springs return them to their paths. Arrow keys turn the view, Enter cycles objects, +/− changes zoom, and Escape or Reset restores the view. `src/lib/orbital-scene.ts` contains rendering and interaction, `src/lib/orbital-data.ts` holds the nine selectable object names, and `src/components/OrbitalObservatory.tsx` manages the controls and scene lifecycle.

The scene loads when visible, stops drawing offscreen or when the tab is hidden, compiles scene shaders asynchronously, caps pixel density, and limits continuous rendering to 30 fps (24 on smaller canvases). Reduced motion stops automatic orbit and star animation while preserving direct interaction. GPU objects, textures, environment maps, and postprocessing targets are disposed on unmount.

## FORM / 05 (fifth hero)

A fully modeled tactile instrument at `/#form-instrument`. Its 768 instanced metal caps sit on individual pistons above a recessed bed. Brushing lifts and tilts nearby pins; holding and dragging depresses the surface. A coupled spring lattice propagates pressure to neighbouring actuators and dissipates energy after release. A knurled frequency dial, height fader, three mechanically depressed mode keys, impulse button, and latching hold switch all change the same surface. The embedded display plots its actual cross-section.

Touch input uses a dedicated region fitted to the projected object: hold/drag works in both directions, while the surrounding stage and gutters retain page scrolling. Only one active contact is captured; cancellation, lost capture, blur, and leaving the viewport release it. Mobile has a Controls panel with native range inputs and at least 44px buttons as an alternative to small physical parts. Keyboard: 1/2/3 select Wave/Ripple/Saddle, arrows adjust height/frequency, Space sends an impulse, H holds, R resets.

`src/lib/form-dynamics.ts` contains the coupled simulation, `src/lib/form-scene.ts` builds the geometry and input behaviour, and `src/components/FormInstrument.tsx` manages lazy loading and accessible controls. All graphics and textures are generated locally. Rendering pauses offscreen, respects reduced motion, and lowers pixel density on slower devices. Verification covers pressure propagation, settling, bounded repeated impulses, and reset. This remains a homepage concept, separate from the Kinetic Type component registry.

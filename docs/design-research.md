# SwayKit: design references and decisions

The brief: an expressive component library with an interactive playground, AI-friendly source delivery, expressive interactions, and a strictly monochrome identity.

## References studied

- [React Bits](https://reactbits.dev/): inspected the live homepage, its editable hero, component gallery, source ownership messaging, code installation flow, and AI-ready documentation. SwayKit uses actual examples and real source delivery as the primary product demonstration.
- [Uiverse](https://uiverse.io/): reviewed its visual discovery, category/search flow, and get-code actions. SwayKit's catalog starts with search, a category filter, and a visual specimen linked directly to the editor.
- [v0 screenshots guidance](https://v0.app/docs/screenshots) and [design mode](https://v0.app/docs/design-mode): reference-based layout analysis, explicit behaviour requirements, and live-preview refinement. This implementation was inspected and iterated in the browser rather than treating the first generated layout as final.
- [v0 text prompting](https://v0.app/docs/text-prompting): staged implementation, concrete technical constraints, and handling of empty/error states.
- [GSAP React guide](https://gsap.com/resources/React/) and [ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/): scoped cleanup, responsive motion preferences, scrubbing, and component lifecycle management.
- [shadcn registry](https://ui.shadcn.com/docs/registry): source distribution using an established CLI.
- [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports): prebuilt routes and static assets for a low-cost hosting footprint.

The Awwwards animation directory could not be retrieved during research; no claim is made that an inaccessible site's implementation was studied. The visual direction follows the user's Awwwards-style brief and the inspectable references above.

## Visual system

- Warm white (#f6f6f3), black (#111), and neutral grays only.
- Locally bundled Manrope with IBM Plex Mono labels; Georgia provides editorial contrast in selected typography demos.
- Oversized, tightly spaced typography behind live 3D artwork. The initial wireform hero was replaced by two stacked interactive concepts.
- Thin dividers, small technical annotations, large specimen areas, and a restrained editor.
- Three homepage specimens are presets of one real component, clearly labeled. No fabricated component count, testimonials, users, sponsors, or awards.

## Motion system

- Three.js renders both hero concepts; damped angular inertia powers the sculpture and Rapier powers the second scene.
- ScrollTrigger section reveals and progressive closing text illumination.
- Seamlessly looping CSS ticker anchored at the bottom of the first viewport, specimen hover transformations, and a replayable live type demo.
- System reduced-motion preferences disable nonessential motion and show final states.
- Each 3D scene pauses outside its section. System preferences control reduced motion; no floating motion toggle.
- Each future component uses the appropriate engine: native CSS/SVG, Motion, GSAP, Three.js, or shaders. Dependencies follow the component rather than a library-wide GSAP requirement.

## Product decisions

The playground is a real editor with live source/configuration sync. Its preview uses an iframe so viewport tests change wrapping behaviour. Component source is copied from the file actually rendered, and registry assets are generated from that file at build time. There is no AI service behind the prompt button: it assembles the exact configuration and source locally.

The implementation remains in the user's repository for their intended Vercel deployment. No alternate hosting account or production publication was created.

Homepage copy was reduced to the product essentials: opening, component specimens, interactive presets, and a short closing line. Longer integration instructions remain in the documentation.

## Interactive hero comparison

Studied the supplied screenshots, four sampled frames of the 12.75-second reference video, and the live [Lusion homepage](https://lusion.co/). The shared composition puts oversized typography behind a central interactive object. The video adds pointer-responsive motion, rather than treating the hero as a flat image.

Two original monochrome concepts are stacked on the homepage for selection:

- **Chrome Study**: a reflective trefoil sculpture, glossy core, and fine orbital rings. Pointer dragging imparts angular velocity; exponential damping provides inertia after release.
- **Kinetic Matter**: porcelain crosses, metal rings, and glossy rounded cubes. Rapier runs at a fixed 60 Hz with compound colliders, spring forces, contact response, and dragging through applied forces. Native keyboard interaction provides a drag alternative.

Three.js RoomEnvironment and PMREM generate the studio reflections locally. No remote models, textures, or image-generation service are needed. Scene code loads on visibility; Rapier loads only for the second scene. Hidden scenes stop rendering. Pixel density is capped, resources are disposed on unmount, and reduced-motion preferences stop autonomous animation while preserving explicit interaction. Pointer events cover mouse, pen, and touch; pan-y preserves vertical page scrolling.

Sources: [Three.js RoomEnvironment](https://threejs.org/docs/pages/RoomEnvironment.html), [PMREMGenerator](https://threejs.org/docs/pages/PMREMGenerator.html), [Rapier rigid bodies](https://rapier.rs/docs/user_guides/javascript/rigid_bodies/), and the installed Next.js lazy-loading guide.

These are homepage concept previews, not additional catalog components. The existing Kinetic Type playground and source registry remain available.

## Little World: third direction

The user's Humankind reference inspired the composition: character silhouettes overlap monumental lettering, with a white stage framed by black. Four original characters were generated as an ink study, then transformed into premium 3D collectible artwork after the user requested a sculpted look. Their material detail is retained while the live shader makes the artwork monochrome.

The third scene uses actual beveled TextGeometry, studio lighting, a shadow-receiving floor, floating 3D ornaments, and layered transparent character sprites. The rendered characters have baked studio detail and depth placement; they are not rotatable full-volume models. Constrained pointer parallax preserves their appearance. Dragging adds movement to a damped spring, releases retain inertia, and keyboard controls provide a drag alternative. The existing two concepts remain ahead of the third.

Prompt and asset provenance: [image-prompts.md](image-prompts.md). Geometry documentation: [TextGeometry](https://threejs.org/docs/pages/TextGeometry.html) and [FontLoader](https://threejs.org/docs/pages/FontLoader.html). The Helvetiker example font is bundled with its original license. The entire site remains a static export.

## Orbital Observatory: fourth direction

The fourth concept moves from collectibles and physical specimens to a full-screen monochrome observatory. A dark central core and luminous accretion disk create the visual anchor. Eight individually modeled objects—Luna, Ringworld, Prism, Relay, Portal, Gyro, Frame, and Helix—occupy layered orbits with an asteroid belt, star field, and faint paths. Selecting an object updates its halo, scale, camera focus, and the visible selection caption. Scattering injects velocity into spring offsets rather than replacing the orbit animation with unrelated effects.

This is live geometry, procedural textures, and custom shader work. The core glow was reduced after a browser review showed excessive bloom obscuring the orbital detail. The scene uses a composer chain with RenderPass, UnrealBloomPass, and OutputPass; shader preparation and a render-rate cap keep interaction responsive. The first frame is drawn directly so hidden embedded surfaces do not wait indefinitely for an animation callback. Keyboard and visible controls provide alternatives to canvas dragging and picking. The prior three concepts remain stacked before it.

Primary implementation references: [ShaderMaterial](https://threejs.org/docs/pages/ShaderMaterial.html), [EffectComposer](https://threejs.org/docs/pages/EffectComposer.html), [UnrealBloomPass](https://threejs.org/docs/pages/UnrealBloomPass.html), and the installed WebGLRenderer implementation for compileAsync. No astronomy simulation accuracy is claimed; this is an original interactive design concept.

## FORM / 05: tactile instrument

Inspected the user's open [23rd Mech Keyboard](https://www.23rd.dev/docs/components/mech-keyboard) in Chrome and pressed a key to verify per-part feedback. The useful principle is local interaction with mechanically distinct parts. The fifth concept applies that principle to an original shape instrument rather than reproducing the keyboard.

[MIT Tangible Media Group's inFORM](https://tangible.media.mit.edu/project/inform/) informed the idea of a shape display with physical affordances. [Teenage Engineering's OP–1 field](https://teenage.engineering/products/op-1) informed the restraint of the instrument layout, milled case, printed legends, and legible physical controls. No artwork, models, or source from either reference was copied. The entire object is procedural Three.js geometry with local canvas labels and a live display.

The visual composition uses a pale studio, oversized faint FORM lettering, a central oblique product view, and short contextual feedback. 768 caps and pistons use [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html); control travel uses damped response, and the pin lattice uses substepped coupled springs. Interaction is spatial: brush, press/hold, drag, release, turn the dial with a wheel, move the fader, latch hold, change pattern, and inject an impulse. A portrait camera fit and projected touch region let users handle the object without trapping all page scrolling. Native controls and keyboard shortcuts provide alternatives.

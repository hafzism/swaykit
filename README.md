# SwayKit

**Components with character. Made to be explored.**

SwayKit is an evolving collection of expressive React components and interactive experiments. Explore an idea, make it your own, and take the code with you.

> **Work in progress** — SwayKit is still taking shape. The first component and playground are available now; more components, interactions, and refinements are on the way. No release date is set yet.

## What's here

- **Kinetic Type** — a customizable character-reveal component with presets, live controls, and responsive sizing.
- **Playground** — adjust the component, switch preview themes and device sizes, and replay the animation.
- **Ready to use** — copy the source, usage code, or an AI prompt containing the component and your chosen settings. A shadcn-compatible registry item is also available.
- **Interactive experiments** — five homepage concepts exploring motion, physics, 3D, and touch interaction. These are design studies, not registry components.

Playground saves stay in your browser; share links carry settings in the URL. The project does not require an AI API key or a database.

## Getting started

You'll need Node.js 20.9 or newer and npm.

```bash
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000).

To check and build the project:

```bash
npm run typecheck
npm run verify
npm run build
```

The build generates the registry assets and exports the site to `out/`. Fonts and production artwork are stored locally. The site runs as static files without a server, database, or runtime API keys.

## Deploy to Vercel

SwayKit is set up for Vercel's Next.js integration. The Hobby plan can be used for eligible personal projects; see [Vercel's Hobby plan](https://vercel.com/docs/plans/hobby) for its current terms and limits.

1. Create an empty repository on GitHub, GitLab, or Bitbucket, and push this project to it. If using GitHub, create the repository without an initial README or license, then run the commands GitHub provides to add the remote and push your existing branch.
2. Sign in to [Vercel](https://vercel.com/), choose **Add New → Project**, and import the repository.
3. Keep the project root as `./` and the framework preset as **Next.js**. Vercel should detect the build settings; the build command is `npm run build`. Leave the output directory at its detected default.
4. No environment variables are required for the current site. Select **Deploy**.
5. Once the build finishes, open the provided `vercel.app` URL. Future pushes to the configured production branch trigger new production deployments; other branches can receive preview deployments.

If a build fails, open its build logs in Vercel and check the root directory and build command. For another static host, publish the generated `out/` directory. See [Vercel's Git deployment guide](https://vercel.com/docs/git) for more details.

## Built with

Next.js, React, TypeScript, GSAP, Three.js, and Rapier. Each future component can use the tools suited to its interaction; dependencies for a portable component should be included in its registry entry and code instructions.

## Project map

```text
src/app/          Pages, layout, and global styles
src/components/   Homepage, playground, and interactive scenes
src/lib/          Component configuration and scene logic
src/registry/     Portable component source
public/r/         Generated registry items
scripts/          Registry generation and verification
docs/             Design research and image references
```

Kinetic Type's canonical source is `src/registry/kinetic-type.tsx`; the build generates the copyable source and registry item from it. See [design research](docs/design-research.md) and [image references](docs/image-prompts.md) for the thinking and assets behind the experiments.

## What's next

More components, playground controls, and interaction ideas will arrive as the collection grows. SwayKit is being actively developed, so its design and APIs may change.

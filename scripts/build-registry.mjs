import { readFile, mkdir, writeFile } from "node:fs/promises";
const source = await readFile("src/registry/kinetic-type.tsx", "utf8");
await mkdir("public/r", { recursive: true });
await writeFile(
  "public/r/kinetic-type.json",
  JSON.stringify(
    {
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      name: "kinetic-type",
      type: "registry:component",
      title: "Kinetic Type",
      description: "A configurable GSAP character reveal.",
      dependencies: ["gsap", "@gsap/react"],
      files: [
        {
          path: "kinetic-type.tsx",
          type: "registry:component",
          target: "components/swaykit/KineticType.tsx",
          content: source,
        },
      ],
    },
    null,
    2,
  ),
);
await mkdir("public/source", { recursive: true });
await writeFile("public/source/KineticType.tsx", source);

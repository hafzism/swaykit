import { readFile } from "node:fs/promises";
import path from "node:path";
import Playground from "@/components/Playground";
export const metadata = { title: "Kinetic Type Playground — SwayKit" };
export default async function Page() {
  const source = await readFile(
    path.join(process.cwd(), "src/registry/kinetic-type.tsx"),
    "utf8",
  );
  return <Playground source={source} />;
}

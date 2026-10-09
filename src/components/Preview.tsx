"use client";
import { useEffect, useState } from "react";
import KineticType from "@/registry/kinetic-type";
import { defaults, parseConfig } from "@/lib/catalog";
export default function Preview() {
  const [config, setConfig] = useState({ ...defaults }),
    [theme, setTheme] = useState("light");
  useEffect(() => {
    const listen = (e: MessageEvent) => {
      if (
        e.origin !== location.origin ||
        e.source !== window.parent ||
        e.data?.type !== "swaykit:config"
      )
        return;
      setConfig({
        ...parseConfig(e.data.config),
        replayKey:
          typeof e.data.config?.replayKey === "number"
            ? e.data.config.replayKey
            : 0,
      });
      setTheme(e.data.theme === "dark" ? "dark" : "light");
    };
    window.addEventListener("message", listen);
    window.parent.postMessage({ type: "swaykit:ready" }, location.origin);
    return () => window.removeEventListener("message", listen);
  }, []);
  return (
    <main className="preview-document" data-theme={theme}>
      <KineticType {...config} />
    </main>
  );
}

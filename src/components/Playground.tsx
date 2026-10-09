"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  Maximize2,
  Minimize2,
  Monitor,
  Moon,
  Play,
  RotateCcw,
  Share2,
  Smartphone,
  Sun,
  Tablet,
  Bookmark,
} from "lucide-react";
import { Header, Footer } from "./Shell";
import { defaults, parseConfig, presets, usageCode } from "@/lib/catalog";
import type { KineticTypeProps } from "@/registry/kinetic-type";
type Config = Required<KineticTypeProps>;
type Tab = "Usage" | "Source" | "AI prompt" | "Install";
export default function Playground({ source }: { source: string }) {
  const [config, setConfig] = useState<Config>({ ...defaults }),
    [tab, setTab] = useState<Tab>("Usage"),
    [theme, setTheme] = useState("light"),
    [device, setDevice] = useState("desktop"),
    [fullscreen, setFullscreen] = useState(false),
    [notice, setNotice] = useState(""),
    [copied, setCopied] = useState(false),
    [origin, setOrigin] = useState(""),
    [saved, setSaved] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null),
    shell = useRef<HTMLDivElement>(null),
    noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = (message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 3500);
  };
  useEffect(() => {
    setOrigin(window.location.origin);
    const params = new URLSearchParams(window.location.search),
      preset = params.get("preset"),
      shared = params.get("config");
    if (preset && preset in presets)
      setConfig({ ...presets[preset as keyof typeof presets] });
    else if (shared) {
      try {
        setConfig(parseConfig(JSON.parse(shared)));
      } catch {
        notify(
          "That shared configuration could not be loaded. Defaults restored.",
        );
      }
    } else {
      try {
        const stored = localStorage.getItem("swaykit:kinetic-type");
        if (stored) {
          setConfig(parseConfig(JSON.parse(stored)));
          setSaved(true);
        }
      } catch {
        /* The playground works without storage. */
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);
  const sendConfig = () =>
    frame.current?.contentWindow?.postMessage(
      { type: "swaykit:config", config, theme },
      window.location.origin,
    );
  useEffect(() => {
    sendConfig();
  }, [config, theme]);
  useEffect(() => {
    if (!fullscreen) return;
    const previous = document.activeElement as HTMLElement | null,
      previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        shell.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input, select, [tabindex="0"]',
        ) || [],
      ).filter((el) => el.getClientRects().length > 0);
    shell.current
      ?.querySelector<HTMLElement>('[aria-label="Exit fullscreen"]')
      ?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = focusable(),
        first = items[0],
        last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [fullscreen]);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (
        event.origin === window.location.origin &&
        event.source === frame.current?.contentWindow &&
        event.data?.type === "swaykit:ready"
      )
        sendConfig();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [config, theme]);
  const update = <K extends keyof Config>(key: K, value: Config[K]) => {
    setSaved(false);
    setConfig((c) => ({ ...c, [key]: value }));
  };
  const usage = usageCode(config);
  const install = `npx shadcn@latest add ${origin || "https://YOUR-DEPLOYED-DOMAIN"}/r/kinetic-type.json`;
  const { replayKey: _replayKey, paused: _paused, ...exportConfig } = config;
  const prompt = `Implement the SwayKit Kinetic Type component in my React project using the complete source below.\n\nInstall dependencies: npm install gsap @gsap/react\nUse the following exact configuration, not approximate visual styling:\n${JSON.stringify(exportConfig, null, 2)}\n\nUse the existing project font for font=\"sans\". The component inherits its text colour. Place it in a responsive container. Respect prefers-reduced-motion and keep GSAP cleanup. For Next.js, keep the component a client component. Adapt the import path to my project.\n\nComponent source (KineticType.tsx):\n${source}\n\nUsage:\n${usage}`;
  const code =
    tab === "Usage"
      ? usage
      : tab === "Source"
        ? source
        : tab === "AI prompt"
          ? prompt
          : `# Add the source to your project\n${install}\n\n# Or install dependencies and copy the Source tab\nnpm install gsap @gsap/react\n\n# Registry import\nimport KineticType from "@/components/swaykit/KineticType";`;
  const copy = async (text: string, isCode = true) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(isCode);
      notify(isCode ? "Copied to clipboard." : "Share link copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify(
        "Clipboard unavailable. Select and copy the text in the code panel.",
      );
    }
  };
  const share = () => {
    const { replayKey, paused, ...values } = config;
    const url = new URL("/components/kinetic-type/", window.location.origin);
    url.searchParams.set("config", JSON.stringify(values));
    copy(url.href, false);
  };
  const save = () => {
    try {
      localStorage.setItem("swaykit:kinetic-type", JSON.stringify(config));
      setSaved(true);
      notify("Preset saved in this browser. It will be here when you return.");
    } catch {
      notify(
        "Browser storage is unavailable. Use Share to keep your configuration.",
      );
    }
  };
  const reset = () => {
    setConfig({ ...defaults, replayKey: config.replayKey + 1 });
    setSaved(false);
    try {
      localStorage.removeItem("swaykit:kinetic-type");
    } catch {}
    notify("Back to the starting point.");
  };
  const ranges: {
    key: "size" | "duration" | "stagger" | "distance";
    label: string;
    min: number;
    max: number;
    step: number;
    unit: string;
  }[] = [
    { key: "size", label: "Font size", min: 24, max: 160, step: 1, unit: "px" },
    {
      key: "duration",
      label: "Duration",
      min: 0.2,
      max: 3,
      step: 0.1,
      unit: "s",
    },
    {
      key: "stagger",
      label: "Character delay",
      min: 0,
      max: 0.2,
      step: 0.005,
      unit: "s",
    },
    {
      key: "distance",
      label: "Reveal distance",
      min: 0,
      max: 180,
      step: 5,
      unit: "%",
    },
  ];
  return (
    <>
      <Header />
      <main id="main">
        <div className="playground-heading">
          <div className="breadcrumbs">
            <Link href="/components/">Components</Link>
            <span>/</span>
            <span>Kinetic Type</span>
          </div>
          <div className="playground-title-row">
            <div>
              <h1>
                Kinetic Type<span className="muted">.</span>
              </h1>
              <p>Set the words. Find your rhythm.</p>
              <div className="component-badges">
                <span>GSAP</span>
                <span>REACT + TS</span>
                <span>RESPONSIVE</span>
                <span>LIGHT / DARK</span>
              </div>
            </div>
            <div className="playground-actions">
              <button className="button" onClick={share}>
                <Share2 size={13} />
                Share
              </button>
              <button className="button button-black" onClick={save}>
                {saved ? <Check size={13} /> : <Bookmark size={13} />}{" "}
                {saved ? "Saved" : "Save preset"}
              </button>
            </div>
          </div>
        </div>
        <div
          ref={shell}
          className={`playground-shell ${fullscreen ? "fullscreen" : ""}`}
          role={fullscreen ? "dialog" : undefined}
          aria-modal={fullscreen ? true : undefined}
          aria-label={fullscreen ? "Fullscreen preview" : undefined}
        >
          <div className="preview-column">
            <div className="preview-toolbar">
              <span className="mono">THE PLAYGROUND</span>
              <div className="toolbar-group">
                {[
                  { id: "desktop", Icon: Monitor },
                  { id: "tablet", Icon: Tablet },
                  { id: "mobile", Icon: Smartphone },
                ].map(({ id, Icon }) => (
                  <button
                    key={id}
                    aria-label={`${id} preview`}
                    aria-pressed={device === id}
                    onClick={() => setDevice(id)}
                  >
                    <Icon size={15} />
                  </button>
                ))}
                <span className="toolbar-divider" />
                <button
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  aria-label={`Switch preview to ${theme === "light" ? "dark" : "light"} mode`}
                >
                  {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
                </button>
                <button
                  onClick={() => setFullscreen(!fullscreen)}
                  aria-label={
                    fullscreen ? "Exit fullscreen" : "Fullscreen preview"
                  }
                >
                  {fullscreen ? (
                    <Minimize2 size={15} />
                  ) : (
                    <Maximize2 size={15} />
                  )}
                </button>
              </div>
            </div>
            <div className="preview-canvas" data-theme={theme}>
              <iframe
                ref={frame}
                src="/preview/"
                title="Kinetic Type live preview"
                className="preview-iframe"
                style={{
                  width:
                    device === "mobile"
                      ? 375
                      : device === "tablet"
                        ? 768
                        : "100%",
                }}
                onLoad={sendConfig}
              />
            </div>
            <div className="preview-footer">
              <span className="mono">
                {device.toUpperCase()} · {theme.toUpperCase()} · LIVE
              </span>
              <button
                className="text-link"
                onClick={() => update("replayKey", config.replayKey + 1)}
              >
                <Play size={11} />
                Replay animation
              </button>
            </div>
            <div className="code-section">
              <div className="code-toolbar">
                <div
                  className="code-tabs"
                  role="tablist"
                  aria-label="Component code"
                >
                  {(["Usage", "Source", "AI prompt", "Install"] as Tab[]).map(
                    (t) => (
                      <button
                        key={t}
                        role="tab"
                        id={`tab-${t.replace(" ", "-")}`}
                        aria-controls="code-panel"
                        aria-selected={tab === t}
                        tabIndex={tab === t ? 0 : -1}
                        onClick={() => setTab(t)}
                        onKeyDown={(e) => {
                          const tabs: Tab[] = [
                            "Usage",
                            "Source",
                            "AI prompt",
                            "Install",
                          ];
                          if (
                            ["ArrowRight", "ArrowLeft", "Home", "End"].includes(
                              e.key,
                            )
                          ) {
                            e.preventDefault();
                            const idx =
                              e.key === "Home"
                                ? 0
                                : e.key === "End"
                                  ? 3
                                  : (tabs.indexOf(t) +
                                      (e.key === "ArrowRight" ? 1 : 3)) %
                                    4;
                            setTab(tabs[idx]);
                            document
                              .getElementById(
                                `tab-${tabs[idx].replace(" ", "-")}`,
                              )
                              ?.focus();
                          }
                        }}
                      >
                        {t}
                      </button>
                    ),
                  )}
                </div>
                <button
                  className="copy-button"
                  onClick={() => copy(code)}
                  aria-label={`Copy ${tab.toLowerCase()}`}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}{" "}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre
                className="code-content"
                role="tabpanel"
                id="code-panel"
                aria-labelledby={`tab-${tab.replace(" ", "-")}`}
                tabIndex={0}
              >
                <code>{code}</code>
              </pre>
              <div className="code-description">
                {tab === "Usage"
                  ? "Your current settings, ready to paste. Copy Source once, then use this configuration."
                  : tab === "Source"
                    ? "Complete standalone component. Requires gsap and @gsap/react; no SwayKit runtime."
                    : tab === "AI prompt"
                      ? "Includes your exact configuration, component source, dependencies, and integration instructions."
                      : "The registry command uses this website’s current domain. For production, run it after deploying."}
              </div>
            </div>
          </div>
          <aside className="control-panel" aria-label="Component customisation">
            <div className="controls-title">
              <span>Make it yours</span>
              <button aria-label="Reset settings" onClick={reset}>
                <RotateCcw size={14} />
              </button>
            </div>
            <label className="control-field">
              <span className="control-label">
                Your text <output>{config.text.length}/100</output>
              </span>
              <input
                aria-label="Your text"
                type="text"
                value={config.text}
                maxLength={100}
                onChange={(e) => update("text", e.target.value)}
              />
            </label>
            <label className="control-field">
              <span className="control-label">Typeface</span>
              <select
                aria-label="Typeface"
                value={config.font}
                onChange={(e) =>
                  update("font", e.target.value as Config["font"])
                }
              >
                <option value="sans">Sans / Inherit</option>
                <option value="serif">Serif / Editorial</option>
                <option value="mono">Mono / Technical</option>
              </select>
            </label>
            {ranges.map((r) => (
              <label className="control-field" key={r.key}>
                <span className="control-label">
                  {r.label}
                  <output>
                    {config[r.key]}
                    {r.unit}
                  </output>
                </span>
                <input
                  type="range"
                  aria-label={r.label}
                  min={r.min}
                  max={r.max}
                  step={r.step}
                  value={config[r.key]}
                  onChange={(e) => update(r.key, Number(e.target.value))}
                />
              </label>
            ))}
            <label className="control-row">
              Outline text
              <span className="switch">
                <input
                  type="checkbox"
                  checked={config.outline}
                  onChange={(e) => update("outline", e.target.checked)}
                />
                <span />
              </span>
            </label>
            <div className="presets">
              <span className="mono">A FEW STARTING POINTS</span>
              <div className="preset-buttons">
                {Object.entries(presets).map(([name, values]) => (
                  <button
                    key={name}
                    onClick={() => {
                      setSaved(false);
                      setConfig({ ...values, replayKey: config.replayKey + 1 });
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </>
  );
}

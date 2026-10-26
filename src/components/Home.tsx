"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  ArrowUpRight,
  ArrowRight,
  Play,
  SlidersHorizontal,
} from "lucide-react";
import { Header, Footer } from "./Shell";
import { HeroConcept } from "./HeroExperiments";
import LittleWorld from "./LittleWorld";
import OrbitalObservatory from "./OrbitalObservatory";
import FormInstrument from "./FormInstrument";
import KineticType from "@/registry/kinetic-type";
import { presets } from "@/lib/catalog";
gsap.registerPlugin(ScrollTrigger, useGSAP);
export default function Home() {
  const root = useRef<HTMLDivElement>(null),
    [replay, setReplay] = useState(0),
    [homePreset, setHomePreset] = useState<
      "Signature" | "Outline" | "Editorial"
    >("Signature");
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) =>
          gsap.from(el, {
            y: 50,
            opacity: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 92%", once: true },
          }),
        );
        gsap.to(".manifesto-word", {
          color: "#fff",
          stagger: 0.08,
          scrollTrigger: {
            trigger: ".manifesto",
            start: "top 70%",
            end: "bottom 70%",
            scrub: 0.5,
          },
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );
  return (
    <div ref={root}>
      <Header />
      <main id="main">
        <div className="hero-screen">
          <HeroConcept variant="chrome" />
          <div className="ticker" aria-hidden="true">
            <div className="ticker-track">
              {[0, 1].map((group) => (
                <div className="ticker-group" key={group}>
                  {[
                    "REACT",
                    "CSS",
                    "MOTION",
                    "GSAP",
                    "THREE.JS",
                    "SVG",
                    "SHADERS",
                    "BENTO",
                    "INTERACTIONS",
                  ].map((keyword) => (
                    <span className="ticker-item" key={keyword}>
                      {keyword}
                      <span className="ticker-star">✳</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <HeroConcept variant="matter" />
        <LittleWorld />
        <OrbitalObservatory />
        <FormInstrument />
        <section className="collection section-pad" id="collection">
          <div className="section-top reveal">
            <span className="eyebrow">01 / THE COLLECTION</span>
            <span className="mono muted">VOL. 001</span>
          </div>
          <div className="section-heading reveal">
            <h2>Components with character.</h2>
            <Link href="/components/" className="text-link">
              Explore the collection <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="specimen-grid">
            <Link
              href="/components/kinetic-type/"
              className="specimen specimen-type reveal"
            >
              <div className="specimen-stage">
                <span className="specimen-corner mono">TYPE / 001</span>
                <div className="specimen-word">
                  Hello<span className="word-star">✳</span>
                </div>
              </div>
              <div className="specimen-info">
                <div>
                  <h3>Kinetic Type</h3>
                  <span>Character reveal · GSAP</span>
                </div>
                <span className="circle-arrow">
                  <ArrowUpRight size={20} />
                </span>
              </div>
            </Link>
            <Link
              href="/components/kinetic-type/?preset=Outline"
              className="specimen specimen-outline reveal"
            >
              <div className="specimen-stage">
                <span className="specimen-corner mono">TYPE / 001-B</span>
                <div className="outline-stack">
                  <span>OUTSIDE</span>
                  <span>THE LINES</span>
                </div>
              </div>
              <div className="specimen-info">
                <div>
                  <h3>Outside the lines</h3>
                  <span>Kinetic Type · Outline preset</span>
                </div>
                <span className="circle-arrow">
                  <ArrowUpRight size={20} />
                </span>
              </div>
            </Link>
            <Link
              href="/components/kinetic-type/?preset=Editorial"
              className="specimen specimen-editorial reveal"
            >
              <div className="specimen-stage">
                <span className="specimen-corner mono">TYPE / 001-C</span>
                <span className="editorial-word">
                  A little
                  <br />
                  <em>drama.</em>
                </span>
              </div>
              <div className="specimen-info">
                <div>
                  <h3>A little drama</h3>
                  <span>Kinetic Type · Editorial preset</span>
                </div>
                <span className="circle-arrow">
                  <ArrowUpRight size={20} />
                </span>
              </div>
            </Link>
          </div>
          <div className="collection-foot">
            <span className="mono muted">KINETIC TYPE / THREE PRESETS</span>
            <span className="mono">REACT + TYPESCRIPT</span>
          </div>
        </section>
        <section className="play-section section-pad" id="playground">
          <div className="section-top reveal">
            <span className="eyebrow">02 / THE PLAYGROUND</span>
          </div>
          <div className="section-heading reveal">
            <h2>Make it yours.</h2>
          </div>
          <div className="home-playground reveal">
            <div className="home-play-toolbar">
              <span>
                <span className="status-dot" /> LIVE PREVIEW
              </span>
              <button
                onClick={() => setReplay(replay + 1)}
                className="text-link"
              >
                Replay <Play size={13} />
              </button>
            </div>
            <div className="home-play-stage">
              <KineticType {...presets[homePreset]} replayKey={replay} />
            </div>
            <div className="home-presets" aria-label="Live demo presets">
              {(["Signature", "Outline", "Editorial"] as const).map((name) => (
                <button
                  key={name}
                  aria-pressed={homePreset === name}
                  onClick={() => {
                    setHomePreset(name);
                    setReplay(replay + 1);
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="home-play-bottom">
              <span className="mono">{`<KineticType text="${presets[homePreset].text}" />`}</span>
              <Link
                href={`/components/kinetic-type/?preset=${homePreset}`}
                className="button button-black"
              >
                Open playground <SlidersHorizontal size={16} />
              </Link>
            </div>
          </div>
        </section>
        <section className="manifesto section-pad">
          <p>
            {["Explore.", "Edit.", "Export."].map((word, i) => (
              <span className="manifesto-word" key={i}>
                {word}{" "}
              </span>
            ))}
          </p>
          <div className="manifesto-bottom">
            <span className="mono">YOUR NEXT MOVE.</span>
            <Link
              href="/components/"
              className="round-link"
              aria-label="Explore components"
            >
              <ArrowUpRight size={36} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

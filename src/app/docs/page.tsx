import Link from "next/link";
import { Header, Footer } from "@/components/Shell";
export const metadata = { title: "Getting Started — SwayKit" };
export default function Page() {
  return (
    <>
      <Header />
      <main id="main">
        <div className="page-heading">
          <span className="eyebrow">DOCUMENTATION / GETTING STARTED</span>
          <h1>
            From a good idea
            <br />
            to your own code.
          </h1>
          <p>A small guide to finding your feel and taking it with you.</p>
        </div>
        <div className="docs-layout">
          <nav className="docs-nav" aria-label="Documentation sections">
            <a href="#start">Getting started</a>
            <a href="#copy">Copy the source</a>
            <a href="#install">CLI installation</a>
            <a href="#ai">Using an AI assistant</a>
            <a href="#customise">Customisation</a>
          </nav>
          <article className="docs-article">
            <section id="start">
              <h2>Start in the playground.</h2>
              <p>
                Choose a component from the{" "}
                <Link href="/components/">collection</Link>. Each component page
                has a live preview, visual controls, complete source, and an
                implementation prompt. The first component is{" "}
                <Link href="/components/kinetic-type/">Kinetic Type</Link>, a
                GSAP character reveal.
              </p>
              <p>
                SwayKit currently targets React and TypeScript. Components
                arrive as source files you can edit, with their dependencies
                listed on the component page.
              </p>
            </section>
            <section id="copy">
              <h2>Copy the source.</h2>
              <p>For Kinetic Type, install its animation dependencies:</p>
              <pre>npm install gsap @gsap/react</pre>
              <p>
                Copy the <strong>Source</strong> tab into{" "}
                <code>KineticType.tsx</code> in your project. Then copy the{" "}
                <strong>Usage</strong> tab and adjust its import path to match
                where you put the file. Usage always reflects your current
                playground settings.
              </p>
              <p>
                The default font and text colour inherit from the parent. You
                can use your own font without installing SwayKit’s website
                fonts.
              </p>
            </section>
            <section id="install">
              <h2>One command, real source.</h2>
              <p>
                The <strong>Install</strong> tab generates a shadcn registry
                command using this website’s current domain. Run it from your
                React project. If prompted, initialise shadcn for your project.
              </p>
              <pre>
                {
                  "npx shadcn@latest add https://YOUR-DEPLOYED-DOMAIN/r/kinetic-type.json"
                }
              </pre>
              <p>
                It adds <code>components/swaykit/KineticType.tsx</code> and its
                animation dependencies. Import the component from that location,
                adjusting for your configured aliases. Deploy this website
                before sharing a production install URL.
              </p>
            </section>
            <section id="ai">
              <h2>Give your AI the full picture.</h2>
              <p>
                The <strong>AI prompt</strong> tab includes your exact
                configuration, complete component source, dependencies, and
                integration instructions. Copy it into your coding assistant and
                add where you want the component placed.
              </p>
              <p>
                This prompt is assembled in your browser. There is no AI API
                call or account required to create it.
              </p>
            </section>
            <section id="customise">
              <h2>Find your version.</h2>
              <ul>
                <li>
                  Adjust text, typeface, font size, duration, character delay,
                  reveal distance, and outline.
                </li>
                <li>
                  Use a preset as a starting point, or reset to the defaults.
                </li>
                <li>
                  Switch preview themes independently of your component
                  settings.
                </li>
                <li>
                  Device controls resize an actual iframe viewport. On narrow
                  screens, the viewport is capped to the available space.
                </li>
                <li>Replay the animation to inspect its timing.</li>
                <li>
                  Save a preset in this browser, or copy a share link that
                  contains the configuration.
                </li>
              </ul>
              <p>
                Components respect your system’s reduced-motion preference.
                Kinetic Type shows the text immediately when reduced motion is
                enabled.
              </p>
            </section>
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}

"use client";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useState } from "react";
export function Logo() {
  return (
    <span className="logo">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <path d="M3 6h22v5H8v6h17v5H3V6Z" fill="currentColor" />
      </svg>
      swaykit<span className="logo-dot">®</span>
    </span>
  );
}
export function Header({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <header className={`site-header ${dark ? "dark" : ""}`}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Link href="/" aria-label="SwayKit home">
        <Logo />
      </Link>
      <nav aria-label="Main navigation" className={open ? "open" : ""}>
        <Link href="/components/" onClick={() => setOpen(false)}>
          Components <span className="nav-count">01</span>
        </Link>
        <Link href="/components/kinetic-type/" onClick={() => setOpen(false)}>
          Playground
        </Link>
        <Link href="/docs/" onClick={() => setOpen(false)}>
          Documentation
        </Link>
      </nav>
      <Link href="/components/" className="header-cta">
        Start building <ArrowUpRight size={16} />
      </Link>
      <button
        className="menu-button icon-button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <Link href="/">
        <Logo />
      </Link>
      <span>Made for the expressive web.</span>
      <div>
        <Link href="/docs/">
          Documentation <ArrowUpRight size={14} />
        </Link>
        <span className="mono">© 2026 SWAYKIT</span>
      </div>
    </footer>
  );
}

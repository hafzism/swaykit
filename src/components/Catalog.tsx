"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, X } from "lucide-react";
import { Header, Footer } from "./Shell";
import { catalog } from "@/lib/catalog";
export default function Catalog() {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All");
  const items = catalog.filter(
    (item) =>
      (filter === "All" || item.category === filter) &&
      [item.name, item.description, ...item.tags]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <Header />
      <main id="main">
        <div className="page-heading">
          <span className="eyebrow">THE COLLECTION / VOL. 001</span>
          <h1>
            Small details.
            <br />
            Big feelings.
          </h1>
          <p>Explore. Customise. Copy.</p>
        </div>
        <div className="catalog-layout">
          <div className="catalog-tools">
            <label className="search-box">
              <Search size={16} />
              <input
                aria-label="Search components"
                placeholder="Find your next component…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  className="icon-button"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                >
                  <X size={13} />
                </button>
              )}
            </label>
            <div className="filter-buttons" aria-label="Categories">
              {["All", "Text"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  aria-pressed={filter === cat}
                >
                  {cat} <span className="mono">01</span>
                </button>
              ))}
            </div>
            <span className="mono muted" role="status">
              {items.length} COMPONENT{items.length === 1 ? "" : "S"}
            </span>
          </div>
          {items.map((item) => (
            <Link
              key={item.slug}
              href={`/components/${item.slug}/`}
              className="specimen specimen-type catalog-card"
            >
              <div className="specimen-stage">
                <span className="specimen-corner mono">TEXT / 001</span>
                <div className="specimen-word">
                  Hello<span className="word-star">✳</span>
                </div>
                <span className="specimen-hint mono">
                  CUSTOMISE IN THE PLAYGROUND
                </span>
              </div>
              <div className="specimen-info">
                <div>
                  <h3>{item.name}</h3>
                  <span>Character reveal · {item.engine} · 4 presets</span>
                </div>
                <span className="circle-arrow">
                  <ArrowUpRight size={20} />
                </span>
              </div>
            </Link>
          ))}
          {items.length === 0 && (
            <div className="empty-state">
              <h2>No matches. Try another direction.</h2>
              <p>Try “text”, “GSAP”, or “reveal”.</p>
              <button
                className="text-link"
                onClick={() => {
                  setQuery("");
                  setFilter("All");
                }}
              >
                Clear filters <ArrowUpRight size={15} />
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

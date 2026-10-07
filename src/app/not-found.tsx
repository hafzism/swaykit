import Link from "next/link";
import { Header, Footer } from "@/components/Shell";
export default function NotFound() {
  return (
    <>
      <Header />
      <main className="page-heading" style={{ minHeight: "65vh" }}>
        <span className="eyebrow">404 / A SMALL DETOUR</span>
        <h1>This way back.</h1>
        <p>That page isn’t in the collection.</p>
        <Link
          href="/components/"
          className="button button-black"
          style={{ marginTop: 30 }}
        >
          Explore components ↗
        </Link>
      </main>
      <Footer />
    </>
  );
}

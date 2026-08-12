"use client";

import { useState } from "react";
import type { Brand } from "@/lib/vula-pages";

const ACCENT = "var(--brand-accent, #0E7C7B)";
const ACCENT_FG = "var(--brand-accent-fg, #ffffff)";
const INK = "var(--brand-ink, #1a1a1a)";

const LOGO_HEIGHT: Record<string, number> = { sm: 28, md: 40, lg: 56 };

/** Site-wide header/nav — logo, published-pages nav menu, optional CTA button, optional
 * WhatsApp utility bar. Every field here is tenant-configurable (Settings → Brand kit →
 * Storefront header), reusing commerce_invoice_settings' existing logo_align/logo_size
 * (already there for invoice branding) plus the new header_* fields (migration 128). Nothing
 * here is hardcoded per-tenant, unlike off_the_hook's own bespoke Header.tsx. */
export default function Header({ tenant, brand, pages }: {
  tenant: string;
  brand: Brand;
  pages: { slug: string; title?: string }[];
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const logoAlign = brand.logo_align || "left";
  const navPosition = brand.header_nav_position || "right";
  const sticky = brand.header_sticky !== false;
  const logoHeight = LOGO_HEIGHT[brand.logo_size || "md"];
  const waHref = brand.whatsapp
    ? `https://wa.me/${brand.whatsapp.replace(/\D/g, "")}`
    : null;

  const navLinks = pages.map((p) => ({
    href: p.slug === "home" ? "/" : `/p/${p.slug}`,
    label: p.title || p.slug,
  }));

  const Logo = (
    <a href="/" aria-label={`${brand.name || tenant} — home`} style={{ display: "inline-flex", alignItems: "center" }}>
      {brand.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.logo_url} alt={brand.name || tenant} style={{ height: logoHeight, width: "auto", objectFit: "contain" }} />
      ) : (
        <span style={{ fontWeight: 800, fontSize: 20, color: INK }}>{brand.name || tenant}</span>
      )}
    </a>
  );

  const Nav = navLinks.length > 0 ? (
    <nav className="vula-header-nav-desktop" style={{ display: "flex", gap: 24, alignItems: "center" }}>
      {navLinks.map((l) => (
        <a key={l.href} href={l.href} style={{ fontSize: 14, fontWeight: 500, color: INK, opacity: 0.75, textDecoration: "none" }}>
          {l.label}
        </a>
      ))}
    </nav>
  ) : null;

  const Cta = brand.header_cta_text ? (
    <a href={brand.header_cta_link || "#"} style={{
      display: "inline-block", borderRadius: 999, padding: "9px 20px", fontWeight: 600, fontSize: 14,
      background: ACCENT, color: ACCENT_FG, textDecoration: "none", whiteSpace: "nowrap",
    }}>{brand.header_cta_text}</a>
  ) : null;

  return (
    <>
      {waHref && (
        <div style={{ background: INK, color: "#fff", fontSize: 12.5, textAlign: "center", padding: "6px 12px" }}>
          <a href={waHref} target="_blank" rel="noreferrer" style={{ color: "#fff", textDecoration: "none" }}>
            💬 Chat to us on WhatsApp
          </a>
        </div>
      )}
      <header style={{
        position: sticky ? "sticky" : "static", top: 0, zIndex: 40,
        background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)",
        borderBottom: "1px solid #eee",
      }}>
        <div style={{
          maxWidth: 1152, margin: "0 auto", padding: "0 20px", height: 64,
          display: "flex", alignItems: "center",
          justifyContent: logoAlign === "center" ? "center" : "space-between",
          flexWrap: navPosition === "below-logo" ? "wrap" : "nowrap", gap: 12,
        }}>
          {logoAlign === "center" && navPosition !== "below-logo" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
              {navPosition === "center" ? Nav : null}
              {Logo}
              {navPosition === "right" ? Nav : null}
            </div>
          ) : (
            <>
              {Logo}
              {navPosition !== "below-logo" && (
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  {Nav}
                  {Cta}
                </div>
              )}
            </>
          )}
          {navPosition === "below-logo" && (
            <div style={{ display: "flex", alignItems: "center", gap: 20, width: "100%", justifyContent: logoAlign === "center" ? "center" : "flex-start" }}>
              {Nav}
              {Cta}
            </div>
          )}
          <button
            className="vula-header-mobile-toggle"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
            style={{ display: "none", border: "none", background: "none", fontSize: 22, cursor: "pointer", color: INK }}
          >
            ☰
          </button>
        </div>
        {mobileOpen && navLinks.length > 0 && (
          <div className="vula-header-mobile-menu" style={{ borderTop: "1px solid #eee", padding: "12px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} style={{ fontSize: 15, color: INK, textDecoration: "none" }} onClick={() => setMobileOpen(false)}>
                {l.label}
              </a>
            ))}
            {Cta}
          </div>
        )}
      </header>
      <style>{`
        @media (max-width: 720px) {
          .vula-header-nav-desktop { display: none !important; }
          .vula-header-mobile-toggle { display: inline-block !important; }
        }
        @media (min-width: 721px) {
          .vula-header-mobile-menu { display: none !important; }
        }
      `}</style>
    </>
  );
}

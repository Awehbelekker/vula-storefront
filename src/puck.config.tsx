"use client";

/**
 * Puck block library — the ONE generic copy used by vula_storefront (the shared multi-tenant
 * renderer). Ported verbatim from off_the_hook/src/puck.config.tsx, which had zero tenant- or
 * env-specific references to begin with (everything tenant-specific — theme colors, which
 * tenant's products to fetch — flows in via CSS vars + window globals set by PuckRender, not
 * hardcoded here), so no changes were needed to make this generic.
 *
 * Brand flows through CSS variables (--brand-accent / --brand-ink / --brand-accent-fg) set by
 * <PuckRender> from the tenant's theme. Blocks reference those vars (with sensible fallbacks),
 * and use only neutral Tailwind utilities for layout — so this exact config renders on any store
 * in that store's brand, with no per-store edits.
 *
 * Depth + animation (2026-07-21): every block gets a scroll-triggered entrance, interactive
 * elements (buttons/cards/product tiles/gallery images) get a hover lift/zoom + shadow. This is a
 * hand-ported copy of vula_dashboard/src/puck/config.jsx's animation system — same keyframe names/
 * timing/classes (see VULA_PUCK_STYLES) so a page looks identical whichever renderer serves it,
 * but expressed in Tailwind's group-hover idiom instead of inline styles. No framer-motion (it's
 * an installed but unused dependency here) — deliberately plain CSS + a tiny IntersectionObserver
 * hook, portable by hand to the kelp copy too.
 */
import { createElement, useEffect, useRef, useState } from "react";
import type { Config, Slot } from "@measured/puck";
import Link from "next/link";

const ACCENT = "var(--brand-accent, #0E7C7B)";
const ACCENT_FG = "var(--brand-accent-fg, #ffffff)";
const INK = "var(--brand-ink, #1a1a1a)";

// Injected once from PuckRender.tsx (public render) — never per block, since there's nowhere else
// for @keyframes/:hover to live given this file otherwise leans on Tailwind utility classes.
// Keep in exact sync (names, timing, class names) with vula_dashboard/src/puck/config.jsx's copy.
export const VULA_PUCK_STYLES = `
@keyframes vula-anim-fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
@keyframes vula-anim-fadeIn { from { opacity:0; } to { opacity:1; } }
@keyframes vula-anim-scaleIn { from { opacity:0; transform:scale(0.94); } to { opacity:1; transform:scale(1); } }
@keyframes vula-anim-slideInLeft { from { opacity:0; transform:translateX(-32px); } to { opacity:1; transform:translateX(0); } }
@keyframes vula-anim-slideInRight { from { opacity:0; transform:translateX(32px); } to { opacity:1; transform:translateX(0); } }
@keyframes vula-anim-shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }

.vula-reveal { opacity: 0; }
.vula-reveal.vula-play-fadeUp { animation: vula-anim-fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both; }
.vula-reveal.vula-play-fadeIn { animation: vula-anim-fadeIn 0.6s cubic-bezier(0.16,1,0.3,1) both; }
.vula-reveal.vula-play-scaleIn { animation: vula-anim-scaleIn 0.6s cubic-bezier(0.16,1,0.3,1) both; }
.vula-reveal.vula-play-slideInLeft { animation: vula-anim-slideInLeft 0.6s cubic-bezier(0.16,1,0.3,1) both; }
.vula-reveal.vula-play-slideInRight { animation: vula-anim-slideInRight 0.6s cubic-bezier(0.16,1,0.3,1) both; }

.vula-stagger-item { opacity: 0; }
.vula-stagger-play .vula-stagger-item { animation: vula-anim-fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both; }

.vula-skeleton { background: linear-gradient(90deg, #f0f0f0 0%, #f8f8f8 50%, #f0f0f0 100%); background-size: 800px 100%; animation: vula-anim-shimmer 1.4s linear infinite; }

.vula-lightbox-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 24px; cursor: zoom-out; animation: vula-anim-fadeIn 0.2s ease both; }
.vula-lightbox-img { max-width: 100%; max-height: 100%; border-radius: 8px; animation: vula-anim-scaleIn 0.25s cubic-bezier(0.16,1,0.3,1) both; }
.vula-lightbox-close { position: absolute; top: 20px; right: 24px; color: #fff; font-size: 32px; line-height: 1; cursor: pointer; background: none; border: none; }

.vula-anim-off .vula-reveal, .vula-anim-off .vula-stagger-item { opacity: 1 !important; animation: none !important; }

@media (prefers-reduced-motion: reduce) {
  .vula-reveal, .vula-stagger-item { opacity: 1 !important; animation: none !important; }
  .vula-skeleton { animation: none !important; }
  .vula-card-lift:hover, .vula-card-lift:hover .vula-zoom-target, .vula-img-zoom:hover img { transform: none !important; }
}
.vula-card-lift { transition: transform 0.25s ease, box-shadow 0.25s ease; overflow: hidden; }
.vula-card-lift:hover { transform: translateY(-4px); }
.vula-card-lift .vula-zoom-target { transition: transform 0.35s ease; }
.vula-card-lift:hover .vula-zoom-target { transform: scale(1.06); }
.vula-img-zoom { overflow: hidden; display: block; }
.vula-img-zoom img { transition: transform 0.35s ease; display: block; width: 100%; height: 100%; object-fit: cover; }
.vula-img-zoom:hover img { transform: scale(1.06); }
`;

// Same scroll-reveal primitive as the dashboard copy — plain IntersectionObserver, reveal once.
// Generic over the element type (section vs div ref) so it plugs into JSX's `ref` typing exactly.
function useRevealRef<T extends HTMLElement = HTMLElement>(playClass: string) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      el.classList.add(playClass);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          el.classList.add(playClass);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [playClass]);
  return ref;
}
function useReveal<T extends HTMLElement = HTMLElement>(anim: string = "fadeUp") {
  return useRevealRef<T>(`vula-play-${anim}`);
}
function useStaggerReveal<T extends HTMLElement = HTMLElement>() {
  return useRevealRef<T>("vula-stagger-play");
}
const staggerDelay = (i: number) => ({ animationDelay: `${Math.min(i, 6) * 80}ms` });

// Per-block animation choice (2026-07-22 depth pass, kept in sync with vula_dashboard/src/puck/
// config.jsx's copy — see that file's comment for the full rationale). `animation` is optional so
// pages saved before this field existed keep their original hardcoded animation unchanged.
const ANIM_FIELD = {
  type: "select" as const, label: "Entrance animation",
  options: [
    { label: "Fade up", value: "fadeUp" }, { label: "Fade in", value: "fadeIn" },
    { label: "Scale in", value: "scaleIn" }, { label: "Slide from left", value: "slideInLeft" },
    { label: "Slide from right", value: "slideInRight" }, { label: "None", value: "none" },
  ],
};
function useBlockReveal<T extends HTMLElement = HTMLElement>(animation: string | undefined, fallbackAnim: string) {
  const anim = animation === "none" ? null : (animation || fallbackAnim);
  const ref = useReveal<T>(anim || fallbackAnim);
  return anim ? { ref, className: "vula-reveal" } : {};
}

type Props = {
  Hero: { title: string; subtitle: string; image: string; overlayOpacity?: number;
    ctaText: string; ctaHref: string; ctaText2?: string; ctaHref2?: string; animation?: string };
  Heading: { text: string; level: "h1" | "h2" | "h3"; align: "left" | "center"; animation?: string };
  Text: { text: string; align: "left" | "center"; animation?: string };
  ImageBlock: { src: string; alt: string; rounded: boolean; animation?: string };
  CTA: { text: string; href: string; variant: "solid" | "outline"; animation?: string };
  Features: { title: string; items: { heading: string; body: string }[] };
  Spacer: { size: "sm" | "md" | "lg" };
  ProductGrid: { title: string; category: string; count: number; linkBase: string };
  FeaturedProducts: { title: string; count: number; linkBase: string };
  CategoryNav: { title: string; linkBase: string };
  TwoColumns: { leftImage: string; leftHeading: string; leftBody: string; rightImage: string; rightHeading: string; rightBody: string };
  Gallery: { title: string; images: { src: string; alt: string }[] };
  Testimonials: { title: string; items: { quote: string; author: string; role: string }[] };
  VideoEmbed: { url: string; caption: string; animation?: string };
  WhatsAppCTA: { phone: string; message: string; buttonText: string; animation?: string };
  ContactCard: { title: string; phone: string; email: string; address: string; hours: string; animation?: string };
  AnnouncementBar: { text: string; linkText: string; href: string };
  Divider: { style: "solid" | "dashed" };
  Section: {
    background: "none" | "solid" | "gradient" | "image";
    backgroundColor: string; backgroundImage: string; overlayOpacity: number;
    padding: "none" | "sm" | "md" | "lg"; tinted: boolean; animation?: string; content: Slot;
  };
};

const wrap = "max-w-6xl mx-auto px-4";

export const config: Config<Props> = {
  root: {
    fields: {
      pageAnimations: {
        type: "radio",
        label: "Page animations",
        options: [{ label: "On", value: true }, { label: "Off", value: false }],
      },
    },
    defaultProps: { pageAnimations: true },
    render: ({ children, pageAnimations }) => (
      <div className={pageAnimations === false ? "vula-anim-off" : undefined}>{children}</div>
    ),
  },
  components: {
    Hero: {
      label: "Hero",
      fields: {
        title: { type: "text" }, subtitle: { type: "textarea" },
        image: { type: "text", label: "Background image URL" },
        overlayOpacity: { type: "number", label: "Dark overlay strength 0-100" },
        ctaText: { type: "text", label: "Primary button text" }, ctaHref: { type: "text", label: "Primary button link" },
        ctaText2: { type: "text", label: "Second button text (optional)" }, ctaHref2: { type: "text", label: "Second button link" },
        animation: ANIM_FIELD,
      },
      defaultProps: { title: "Your headline", subtitle: "A short supporting line.", image: "", overlayOpacity: 55,
        ctaText: "Shop now", ctaHref: "/shop", ctaText2: "", ctaHref2: "" },
      // Named (not anonymous) so eslint-plugin-react-hooks recognizes this as a component and
      // allows the hook call below — Puck genuinely invokes `render` as <Component {...props} />,
      // but the lint rule's heuristic only accepts that for a capitalized function name.
      render: function Render({ title, subtitle, image, overlayOpacity, ctaText, ctaHref, ctaText2, ctaHref2, animation }) {
        const reveal = useBlockReveal(animation, "fadeIn");
        const overlay = overlayOpacity ?? 55;
        return (
          <section {...reveal} className={`relative flex items-center justify-center text-center text-white ${reveal.className || ""}`}
            style={{ minHeight: 420, backgroundColor: ACCENT, backgroundImage: image ? `url(${image})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>
            <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,${Math.min(overlay, 100) * 0.27 / 100}) 0%, rgba(0,0,0,${Math.min(overlay, 100) / 100}) 100%)` }} />
            <div className="relative z-10 max-w-3xl px-4 py-20">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{title}</h1>
              {subtitle ? <p className="text-lg opacity-90 mb-6">{subtitle}</p> : null}
              {(ctaText || ctaText2) && (
                <div className="flex gap-3 justify-center flex-wrap">
                  {ctaText ? (
                    <Link href={ctaHref || "#"} className="inline-block rounded-full px-7 py-3 font-semibold shadow-md transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                      style={{ backgroundColor: ACCENT_FG, color: INK }}>{ctaText}</Link>
                  ) : null}
                  {ctaText2 ? (
                    <Link href={ctaHref2 || "#"} className="inline-block rounded-full px-7 py-3 font-semibold border border-white/70 text-white no-underline transition-transform duration-200 hover:-translate-y-0.5">
                      {ctaText2}
                    </Link>
                  ) : null}
                </div>
              )}
            </div>
          </section>
        );
      },
    },
    Heading: {
      label: "Heading",
      fields: {
        text: { type: "text" },
        level: { type: "select", options: [{ label: "H1", value: "h1" }, { label: "H2", value: "h2" }, { label: "H3", value: "h3" }] },
        align: { type: "select", options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }] },
        animation: ANIM_FIELD,
      },
      defaultProps: { text: "Section heading", level: "h2", align: "left" },
      render: function Render({ text, level, align, animation }) {
        const size = level === "h1" ? "text-4xl" : level === "h2" ? "text-3xl" : "text-2xl";
        const reveal = useBlockReveal<HTMLDivElement>(animation, "fadeUp");
        return (
          <div {...reveal} className={`${wrap} py-6 ${reveal.className || ""}`}>
            {createElement(level, { className: `${size} font-bold ${align === "center" ? "text-center" : ""}`, style: { color: INK } }, text)}
          </div>
        );
      },
    },
    Text: {
      label: "Text",
      fields: {
        text: { type: "textarea" },
        align: { type: "select", options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }] },
        animation: ANIM_FIELD,
      },
      defaultProps: { text: "Write your content here.", align: "left" },
      render: function Render({ text, align, animation }) {
        const reveal = useBlockReveal<HTMLDivElement>(animation, "fadeUp");
        return (
          <div {...reveal} className={`${wrap} py-3 ${reveal.className || ""}`}>
            <p className={`leading-relaxed whitespace-pre-line max-w-3xl text-gray-600 ${align === "center" ? "mx-auto text-center" : ""}`}>{text}</p>
          </div>
        );
      },
    },
    ImageBlock: {
      label: "Image",
      fields: {
        src: { type: "text", label: "Image URL" }, alt: { type: "text" },
        rounded: { type: "radio", options: [{ label: "Rounded", value: true }, { label: "Square", value: false }] },
        animation: ANIM_FIELD,
      },
      defaultProps: { src: "", alt: "", rounded: true },
      render: function Render({ src, alt, rounded, animation }) {
        const reveal = useBlockReveal<HTMLDivElement>(animation, "scaleIn");
        return (
          <div {...reveal} className={`${wrap} py-6 ${reveal.className || ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {src ? <img src={src} alt={alt} className={`w-full object-cover shadow-sm ${rounded ? "rounded-2xl" : ""}`} /> : <div className={`h-48 bg-gray-100 ${rounded ? "rounded-2xl" : ""}`} />}
          </div>
        );
      },
    },
    CTA: {
      label: "Button",
      fields: {
        text: { type: "text" }, href: { type: "text" },
        variant: { type: "select", options: [{ label: "Solid", value: "solid" }, { label: "Outline", value: "outline" }] },
        animation: ANIM_FIELD,
      },
      defaultProps: { text: "Get in touch", href: "/contact", variant: "solid" },
      render: function Render({ text, href, variant, animation }) {
        const reveal = useBlockReveal<HTMLDivElement>(animation, "fadeUp");
        return (
          <div {...reveal} className={`${wrap} py-5 text-center ${reveal.className || ""}`}>
            <Link href={href || "#"} className="inline-block rounded-full px-7 py-3 font-semibold border shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              style={variant === "solid"
                ? { backgroundColor: ACCENT, color: ACCENT_FG, borderColor: ACCENT }
                : { color: ACCENT, borderColor: ACCENT }}>
              {text}
            </Link>
          </div>
        );
      },
    },
    Features: {
      label: "Feature row (3)",
      fields: {
        title: { type: "text" },
        items: {
          type: "array", arrayFields: { heading: { type: "text" }, body: { type: "textarea" } },
          defaultItemProps: { heading: "Feature", body: "Describe it." },
        },
      },
      defaultProps: {
        title: "Why us",
        items: [
          { heading: "Fresh", body: "Caught daily." },
          { heading: "Local", body: "Cape Town sourced." },
          { heading: "Delivered", body: "To your door." },
        ],
      },
      render: function Render({ title, items }) {
        const gridRef = useStaggerReveal<HTMLDivElement>();
        return (
          <section className={`${wrap} py-12`}>
            {title ? <h2 className="text-3xl font-bold text-center mb-8" style={{ color: INK }}>{title}</h2> : null}
            <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(items || []).map((it, i) => (
                <div key={i} className="vula-stagger-item vula-card-lift rounded-2xl border border-gray-200 p-6 text-center shadow-sm bg-white" style={staggerDelay(i)}>
                  <h3 className="font-semibold text-lg mb-2" style={{ color: INK }}>{it.heading}</h3>
                  <p className="text-gray-600 text-sm">{it.body}</p>
                </div>
              ))}
            </div>
          </section>
        );
      },
    },
    Spacer: {
      label: "Spacer",
      fields: { size: { type: "select", options: [{ label: "Small", value: "sm" }, { label: "Medium", value: "md" }, { label: "Large", value: "lg" }] } },
      defaultProps: { size: "md" },
      render: ({ size }) => <div className={size === "sm" ? "h-6" : size === "lg" ? "h-24" : "h-12"} />,
    },
    ProductGrid: {
      label: "Product grid (live)",
      fields: {
        title: { type: "text" },
        category: { type: "text", label: "Category key (blank = all)" },
        count: { type: "number", label: "Max products" },
        linkBase: { type: "text", label: "Product link base" },
      },
      defaultProps: { title: "Shop the range", category: "", count: 8, linkBase: "/shop" },
      render: (props) => <LiveProducts {...props} mode="all" />,
    },
    FeaturedProducts: {
      label: "Featured products (live)",
      fields: {
        title: { type: "text" },
        count: { type: "number", label: "Max products" },
        linkBase: { type: "text", label: "Product link base" },
      },
      defaultProps: { title: "Today's catch", count: 4, linkBase: "/shop" },
      render: (props) => <LiveProducts {...props} mode="featured" />,
    },
    CategoryNav: {
      label: "Category tiles (live)",
      fields: { title: { type: "text" }, linkBase: { type: "text", label: "Shop link base" } },
      defaultProps: { title: "Browse by category", linkBase: "/shop" },
      render: (props) => <LiveCategories {...props} />,
    },
    TwoColumns: {
      label: "Two columns",
      fields: {
        leftImage: { type: "text", label: "Left image URL (blank = text only)" },
        leftHeading: { type: "text", label: "Left heading" },
        leftBody: { type: "textarea", label: "Left body" },
        rightImage: { type: "text", label: "Right image URL (blank = text only)" },
        rightHeading: { type: "text", label: "Right heading" },
        rightBody: { type: "textarea", label: "Right body" },
      },
      defaultProps: {
        leftImage: "", leftHeading: "Our story", leftBody: "Tell it here.",
        rightImage: "", rightHeading: "What makes us different", rightBody: "Tell it here.",
      },
      render: function Render({ leftImage, leftHeading, leftBody, rightImage, rightHeading, rightBody }) {
        const leftRef = useReveal<HTMLDivElement>("slideInLeft");
        const rightRef = useReveal<HTMLDivElement>("slideInRight");
        const cols = [
          { ref: leftRef, img: leftImage, h: leftHeading, b: leftBody },
          { ref: rightRef, img: rightImage, h: rightHeading, b: rightBody },
        ];
        return (
          <section className={`${wrap} py-10 grid gap-8`} style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
            {cols.map((col, i) => (
              <div key={i} ref={col.ref} className="vula-reveal">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {col.img ? <img src={col.img} alt="" className="w-full rounded-xl mb-4 object-cover shadow-sm" style={{ maxHeight: 240 }} /> : null}
                {col.h ? <h3 className="text-xl font-extrabold mb-2" style={{ color: INK }}>{col.h}</h3> : null}
                {col.b ? <p className="text-gray-600 leading-relaxed whitespace-pre-line">{col.b}</p> : null}
              </div>
            ))}
          </section>
        );
      },
    },
    Gallery: {
      label: "Gallery",
      fields: {
        title: { type: "text" },
        images: {
          type: "array",
          arrayFields: { src: { type: "text", label: "Image URL" }, alt: { type: "text" } },
          defaultItemProps: { src: "", alt: "" },
        },
      },
      defaultProps: { title: "Gallery", images: [] },
      render: function Render({ title, images }) {
        const gridRef = useStaggerReveal<HTMLDivElement>();
        const [openIndex, setOpenIndex] = useState<number | null>(null);
        const shown = (images || []).filter((im) => im.src);
        useEffect(() => {
          if (openIndex === null) return;
          const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenIndex(null); };
          window.addEventListener("keydown", onKey);
          return () => window.removeEventListener("keydown", onKey);
        }, [openIndex]);
        return (
          <section className={`${wrap} py-10`}>
            {title ? <h2 className="text-3xl font-extrabold text-center mb-7" style={{ color: INK }}>{title}</h2> : null}
            <div ref={gridRef} className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))" }}>
              {shown.map((im, i) => (
                <div key={i} className="vula-stagger-item vula-img-zoom rounded-xl cursor-zoom-in" style={{ ...staggerDelay(i), height: 160 }}
                  onClick={() => setOpenIndex(i)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.src} alt={im.alt || ""} />
                </div>
              ))}
            </div>
            {shown.length === 0 && <p className="text-center text-gray-400">Add images in the editor →</p>}
            {openIndex !== null && shown[openIndex] ? (
              <div className="vula-lightbox-overlay" onClick={() => setOpenIndex(null)}>
                <button className="vula-lightbox-close" onClick={(e) => { e.stopPropagation(); setOpenIndex(null); }} aria-label="Close">×</button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="vula-lightbox-img" src={shown[openIndex].src} alt={shown[openIndex].alt || ""} onClick={(e) => e.stopPropagation()} />
              </div>
            ) : null}
          </section>
        );
      },
    },
    Testimonials: {
      label: "Testimonials",
      fields: {
        title: { type: "text" },
        items: {
          type: "array",
          arrayFields: { quote: { type: "textarea" }, author: { type: "text" }, role: { type: "text", label: "Role / location" } },
          defaultItemProps: { quote: "They made it so easy.", author: "A happy customer", role: "" },
        },
      },
      defaultProps: { title: "What customers say", items: [{ quote: "They made it so easy.", author: "A happy customer", role: "" }] },
      render: function Render({ title, items }) {
        const gridRef = useStaggerReveal<HTMLDivElement>();
        return (
          <section className={`${wrap} py-10`}>
            {title ? <h2 className="text-3xl font-extrabold text-center mb-7" style={{ color: INK }}>{title}</h2> : null}
            <div ref={gridRef} className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
              {(items || []).map((it, i) => (
                <div key={i} className="vula-stagger-item vula-card-lift rounded-2xl border border-gray-200 p-6 shadow-sm" style={{ ...staggerDelay(i), background: "#fafafa" }}>
                  <p className="italic text-gray-700 leading-relaxed mb-3">&ldquo;{it.quote}&rdquo;</p>
                  <div className="font-bold text-sm" style={{ color: INK }}>{it.author}</div>
                  {it.role ? <div className="text-gray-400 text-xs">{it.role}</div> : null}
                </div>
              ))}
            </div>
          </section>
        );
      },
    },
    VideoEmbed: {
      label: "Video",
      fields: { url: { type: "text", label: "YouTube / Vimeo / direct video URL" }, caption: { type: "text" }, animation: ANIM_FIELD },
      defaultProps: { url: "", caption: "" },
      render: function Render({ url, caption, animation }) {
        const yt = (url || "").match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([\w-]+)/);
        const vimeo = (url || "").match(/vimeo\.com\/(\d+)/);
        const embedSrc = yt ? `https://www.youtube.com/embed/${yt[1]}` : vimeo ? `https://player.vimeo.com/video/${vimeo[1]}` : null;
        const reveal = useBlockReveal(animation, "fadeUp");
        return (
          <section {...reveal} className={`${wrap} py-10 ${reveal.className || ""}`}>
            <div className="relative rounded-2xl overflow-hidden shadow-md" style={{ paddingTop: "56.25%", background: "#000" }}>
              {embedSrc ? (
                <iframe src={embedSrc} title={caption || "Video"} allowFullScreen className="absolute inset-0 w-full h-full border-0" />
              ) : url ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={url} controls className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">Add a video URL →</div>
              )}
            </div>
            {caption ? <p className="text-center text-gray-400 text-sm mt-2.5">{caption}</p> : null}
          </section>
        );
      },
    },
    WhatsAppCTA: {
      label: "WhatsApp button",
      fields: {
        phone: { type: "text", label: "Phone (27…, no +)" },
        message: { type: "text", label: "Pre-filled message" },
        buttonText: { type: "text" },
        animation: ANIM_FIELD,
      },
      defaultProps: { phone: "", message: "Hi! I'd like to order.", buttonText: "💬 Chat on WhatsApp" },
      render: function Render({ phone, message, buttonText, animation }) {
        const n = (phone || "").replace(/\D/g, "");
        const href = n ? `https://wa.me/${n}${message ? `?text=${encodeURIComponent(message)}` : ""}` : "#";
        const reveal = useBlockReveal<HTMLDivElement>(animation, "fadeUp");
        return (
          <div {...reveal} className={`${wrap} py-6 text-center ${reveal.className || ""}`}>
            <a href={href} target="_blank" rel="noreferrer" className="inline-block rounded-full px-8 py-3.5 font-bold text-white text-base no-underline shadow-md transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              style={{ background: "#25D366" }}>{buttonText}</a>
          </div>
        );
      },
    },
    ContactCard: {
      label: "Contact card",
      fields: {
        title: { type: "text" },
        phone: { type: "text" }, email: { type: "text" },
        address: { type: "textarea" }, hours: { type: "textarea" },
        animation: ANIM_FIELD,
      },
      defaultProps: { title: "Get in touch", phone: "", email: "", address: "", hours: "" },
      render: function Render({ title, phone, email, address, hours, animation }) {
        const reveal = useBlockReveal(animation, "fadeUp");
        return (
          <section {...reveal} className={`${wrap} py-10 ${reveal.className || ""}`}>
            <div className="vula-card-lift rounded-2xl border border-gray-200 p-7 mx-auto shadow-sm bg-white" style={{ maxWidth: 420 }}>
              {title ? <h3 className="text-xl font-extrabold mb-3.5" style={{ color: INK }}>{title}</h3> : null}
              {phone ? <p className="my-1.5 text-gray-700">📞 <a href={`tel:${phone}`} className="text-gray-700">{phone}</a></p> : null}
              {email ? <p className="my-1.5 text-gray-700">✉️ <a href={`mailto:${email}`} className="text-gray-700">{email}</a></p> : null}
              {address ? <p className="my-1.5 text-gray-700 whitespace-pre-line">📍 {address}</p> : null}
              {hours ? <p className="my-1.5 text-gray-700 whitespace-pre-line">🕐 {hours}</p> : null}
            </div>
          </section>
        );
      },
    },
    AnnouncementBar: {
      label: "Announcement bar",
      fields: { text: { type: "text" }, linkText: { type: "text", label: "Link text (optional)" }, href: { type: "text" } },
      defaultProps: { text: "🎉 Free delivery on orders over R500", linkText: "", href: "" },
      render: ({ text, linkText, href }) => (
        <div className="text-center text-sm font-semibold py-2.5 px-4" style={{ background: ACCENT, color: ACCENT_FG }}>
          {text} {linkText ? <a href={href || "#"} className="underline ml-1.5" style={{ color: ACCENT_FG }}>{linkText}</a> : null}
        </div>
      ),
    },
    Divider: {
      label: "Divider",
      fields: { style: { type: "select", options: [{ label: "Solid", value: "solid" }, { label: "Dashed", value: "dashed" }] } },
      defaultProps: { style: "solid" },
      render: ({ style }) => (
        <div className={`${wrap} py-2`}>
          <hr style={{ border: "none", borderTop: `1px ${style || "solid"} #e5e5e5` }} />
        </div>
      ),
    },
    Section: {
      label: "Section (background + nested blocks)",
      fields: {
        background: { type: "select", label: "Background", options: [
          { label: "None", value: "none" }, { label: "Solid color", value: "solid" },
          { label: "Gradient", value: "gradient" }, { label: "Image", value: "image" },
        ] },
        backgroundColor: { type: "text", label: "Background color (hex — Solid/Gradient)" },
        backgroundImage: { type: "text", label: "Background image URL (if Image)" },
        overlayOpacity: { type: "number", label: "Dark overlay opacity 0-100 (if Image)" },
        padding: { type: "select", label: "Padding", options: [
          { label: "None", value: "none" }, { label: "Small", value: "sm" },
          { label: "Medium", value: "md" }, { label: "Large", value: "lg" },
        ] },
        tinted: { type: "radio", label: "Tint", options: [{ label: "Light brand tint", value: true }, { label: "Plain", value: false }] },
        animation: ANIM_FIELD,
        content: { type: "slot" },
      },
      defaultProps: {
        background: "none", backgroundColor: "", backgroundImage: "", overlayOpacity: 40,
        padding: "md", tinted: false, content: [],
      },
      render: function Render({ background, backgroundColor, backgroundImage, overlayOpacity, padding, tinted, animation, content: Content }) {
        const padPx = padding === "none" ? 0 : padding === "sm" ? 24 : padding === "lg" ? 96 : 48;
        const bgStyle: React.CSSProperties =
          background === "solid" ? { backgroundColor: backgroundColor || ACCENT } :
          background === "gradient" ? { backgroundImage: `linear-gradient(135deg, ${backgroundColor || ACCENT} 0%, ${INK} 100%)` } :
          background === "image" && backgroundImage ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" } :
          tinted ? { background: "color-mix(in srgb, var(--brand-accent, #0E7C7B) 6%, white)" } : {};
        const reveal = useBlockReveal(animation, "fadeIn");
        return (
          <section {...reveal} className={`relative ${reveal.className || ""}`} style={{ padding: `${padPx}px 16px`, ...bgStyle }}>
            {background === "image" && backgroundImage ? (
              <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${(overlayOpacity ?? 40) / 100})` }} />
            ) : null}
            <div className={`relative z-10 ${wrap}`} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Content />
            </div>
          </section>
        );
      },
    },
  },
};

/* ── Live product blocks (synced from vula_dashboard/src/puck/config.jsx 2026-07-17 — keep block
   names/props IN SYNC across dashboard + off_the_hook + kelp copies). Tenant + API come from
   window.__VULA_PAGE_TENANT/__VULA_API set by PuckRender; sale-aware pricing (migration 073).
   Skeleton loading (2026-07-21) replaces the old plain "Loading…" text. */

function pageTenant() {
  return (typeof window !== "undefined" && (window as unknown as Record<string, string>).__VULA_PAGE_TENANT) || "off-the-hook";
}
function apiBase() {
  return (typeof window !== "undefined" && (window as unknown as Record<string, string>).__VULA_API) || "https://vula-group-production.up.railway.app";
}
type LiveProduct = {
  id?: string; slug: string; name: string; category?: string; sold_by?: string;
  price_cents?: number; sale_price_cents?: number | null; sale_ends_at?: string | null;
  image_url?: string | null; images?: string[] | null; is_daily_catch?: boolean;
  variant_price_range?: { min: number; max: number } | null;
};

function priceParts(p: LiveProduct) {
  const base = p.price_cents || 0;
  const sale = p.sale_price_cents;
  const active = sale && (!p.sale_ends_at || new Date(p.sale_ends_at) > new Date());
  return { now: active ? sale : base, was: active ? base : null };
}
const R = (c: number) => `R${(c / 100).toFixed(2)}`;

function ProductSkeletonGrid({ count }: { count?: number }) {
  return (
    <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))" }}>
      {Array.from({ length: count || 8 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-200 overflow-hidden">
          <div className="vula-skeleton" style={{ height: 144 }} />
          <div className="px-3 py-2.5">
            <div className="vula-skeleton rounded" style={{ height: 14, width: "70%", marginBottom: 8 }} />
            <div className="vula-skeleton rounded" style={{ height: 14, width: "40%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function LiveProducts({ title, category, count, linkBase, mode }: { title?: string; category?: string; count?: number; linkBase?: string; mode: "all" | "featured" }) {
  const [products, setProducts] = useState<LiveProduct[] | null>(null);
  const gridRef = useStaggerReveal<HTMLDivElement>();
  useEffect(() => {
    fetch(`${apiBase()}/v1/commerce/${pageTenant()}/products`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products || d || []))
      .catch(() => setProducts([]));
  }, []);
  let rows = products || [];
  if (mode === "featured") rows = rows.filter((p) => p.is_daily_catch);
  if (category) rows = rows.filter((p) => p.category === category);
  rows = rows.slice(0, count || 8);
  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      {title ? <h2 className="text-3xl font-extrabold text-center mb-7" style={{ color: INK }}>{title}</h2> : null}
      {products === null ? (
        <ProductSkeletonGrid count={count} />
      ) : rows.length === 0 ? (
        <p className="text-center text-gray-400">No products to show yet.</p>
      ) : (
        <div ref={gridRef} className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))" }}>
          {rows.map((p, i) => {
            const pr = priceParts(p);
            const img = (p.images && p.images[0]) || p.image_url;
            return (
              <a key={p.id || p.slug} href={`${linkBase || "/shop"}/${p.slug}`}
                 className="vula-stagger-item vula-card-lift block rounded-2xl border border-gray-200 bg-white no-underline shadow-sm" style={{ ...staggerDelay(i), color: INK }}>
                <div className="vula-zoom-target h-36 bg-gray-100" style={{ backgroundImage: img ? `url(${img})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }} />
                <div className="px-3 py-2.5">
                  <div className="font-semibold text-sm mb-1">{p.name}</div>
                  <div className="text-sm">
                    {p.variant_price_range ? (
                      <span className="font-bold" style={{ color: "var(--brand-accent, #0E7C7B)" }}>
                        {p.variant_price_range.min === p.variant_price_range.max ? R(p.variant_price_range.min) : `From ${R(p.variant_price_range.min)}`}
                      </span>
                    ) : (<>
                      <span className="font-bold" style={{ color: "var(--brand-accent, #0E7C7B)" }}>{R(pr.now)}</span>
                      {pr.was ? <span className="ml-1.5 text-gray-400 line-through text-xs">{R(pr.was)}</span> : null}
                      <span className="text-gray-400 text-xs">{p.sold_by === "kg" ? " /kg" : ""}</span>
                    </>)}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}

function LiveCategories({ title, linkBase }: { title?: string; linkBase?: string }) {
  const [cats, setCats] = useState<{ key: string; n: number }[] | null>(null);
  const gridRef = useStaggerReveal<HTMLDivElement>();
  useEffect(() => {
    fetch(`${apiBase()}/v1/commerce/${pageTenant()}/products`)
      .then((r) => r.json())
      .then((d) => {
        const rows = d.products || d || [];
        const seen: Record<string, number> = {};
        rows.forEach((p: LiveProduct) => { if (p.category) seen[p.category] = (seen[p.category] || 0) + 1; });
        setCats(Object.entries(seen).map(([key, n]) => ({ key, n: n as number })));
      })
      .catch(() => setCats([]));
  }, []);
  const label = (k: string) => k.replace(/_/g, " ").replace(/\w/g, (c) => c.toUpperCase());
  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      {title ? <h2 className="text-3xl font-extrabold text-center mb-7" style={{ color: INK }}>{title}</h2> : null}
      {cats === null ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="vula-skeleton rounded-2xl" style={{ height: 80 }} />
          ))}
        </div>
      ) : (
        <div ref={gridRef} className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
          {(cats || []).map((c, i) => (
            <a key={c.key} href={`${linkBase || "/shop"}?category=${c.key}`}
               className="vula-stagger-item vula-card-lift no-underline text-center py-6 px-3 rounded-2xl border border-gray-200 bg-white shadow-sm" style={{ ...staggerDelay(i), color: INK }}>
              <div className="font-bold text-[15px]">{label(c.key)}</div>
              <div className="text-gray-400 text-xs mt-1">{c.n} item{c.n === 1 ? "" : "s"}</div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

export default config;

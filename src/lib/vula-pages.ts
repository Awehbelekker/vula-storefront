/**
 * Vula page service client (server-side only — holds the shared API key).
 * Ported from off_the_hook/src/lib/vula-pages.ts, generalized to take a tenant per call
 * instead of one baked in via env var — this app serves every tenant, not just one.
 */
import "server-only";

const VULA_API = process.env.NEXT_PUBLIC_VULA_API_URL || "https://vula-group-production.up.railway.app";
const KEY = process.env.VULA_API_KEY || "";

export type PuckData = { content: unknown[]; root: Record<string, unknown>; zones?: Record<string, unknown> };
export type VulaPage = {
  id?: string; tenant_id?: string; slug: string; title?: string;
  puck_data: PuckData; seo?: Record<string, string>; status?: "draft" | "published"; updated_at?: string;
};

const headers = { "Content-Type": "application/json", "X-API-Key": KEY };

export async function getPublishedPage(tenant: string, slug: string): Promise<VulaPage | null> {
  const res = await fetch(`${VULA_API}/v1/commerce/${tenant}/pages/${slug}`, { headers, next: { revalidate: 30 } });
  if (!res.ok) return null;
  return res.json();
}

export async function listPublishedPages(tenant: string): Promise<{ slug: string; title?: string }[]> {
  const res = await fetch(`${VULA_API}/v1/commerce/${tenant}/pages`, { headers, next: { revalidate: 30 } });
  if (!res.ok) return [];
  return (await res.json()).pages || [];
}

/** store_url for the sitemap base URL / "already has a custom domain" checks. */
export async function getTenantInfo(tenant: string): Promise<{ store_url?: string }> {
  try {
    const res = await fetch(`${VULA_API}/v1/tenants/${tenant}`, { headers, next: { revalidate: 300 } });
    if (!res.ok) return {};
    const d = await res.json();
    return { store_url: d.store_url };
  } catch {
    return {};
  }
}

export type Brand = {
  name?: string; logo_url?: string; accent_color?: string; ink_color?: string;
  logo_align?: "left" | "center"; logo_size?: "sm" | "md" | "lg";
  header_sticky?: boolean; header_nav_position?: "right" | "center" | "below-logo";
  header_cta_text?: string; header_cta_link?: string; whatsapp?: string;
};

/** Single source of truth for brand + header layout (GET /v1/commerce/{tenant}/brand) — the
 * SAME tenant-editable commerce_invoice_settings row that already drives invoice PDFs; nothing
 * here is a separate/parallel config. */
export async function getBrand(tenant: string): Promise<Brand> {
  try {
    const res = await fetch(`${VULA_API}/v1/commerce/${tenant}/brand`, { headers, next: { revalidate: 300 } });
    if (!res.ok) return {};
    return res.json();
  } catch {
    return {};
  }
}

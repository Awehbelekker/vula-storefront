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

/** Tenant theme + store_url for brand-token flow-through and sitemap base URL. */
export async function getTenantInfo(tenant: string): Promise<{ theme?: Record<string, string>; store_url?: string }> {
  try {
    const res = await fetch(`${VULA_API}/v1/tenants/${tenant}`, { headers, next: { revalidate: 300 } });
    if (!res.ok) return {};
    const d = await res.json();
    return { theme: d.theme || {}, store_url: d.store_url };
  } catch {
    return {};
  }
}

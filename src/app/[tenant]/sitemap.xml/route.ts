import { listPublishedPages } from "@/lib/vula-pages";

// Built natively here rather than proxying vula_mind's own GET /{tenant}/sitemap.xml — that
// endpoint assumes the tenant's own hand-wired domain (store_url) and returns empty otherwise
// (see commerce.py's comment on that route). This app knows its own domain from the request
// itself, so it can produce a correct sitemap for every tenant, including ones with no
// store_url set (i.e. every tenant on the free {tenant}.vula.site subdomain).
export async function GET(req: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const origin = new URL(req.url).origin;
  const pages = await listPublishedPages(tenant);
  const entries = pages
    .map((p) => `  <url><loc>${origin}/p/${p.slug}</loc></url>`)
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}

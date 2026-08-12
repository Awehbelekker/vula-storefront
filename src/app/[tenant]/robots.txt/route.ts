export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const body = `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain" } });
}

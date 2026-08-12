import { getBrand, listPublishedPages } from "@/lib/vula-pages";
import Header from "@/components/Header";

// Wraps every [tenant]/* route (homepage, /p/[slug]) — Next's fetch memoization dedupes the
// getBrand() call this makes against the identical one page.tsx/p/[slug]/page.tsx already make
// for the Puck brand-token injection, so this doesn't double the real network calls.
export default async function TenantLayout({
  children, params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const [brand, pages] = await Promise.all([getBrand(tenant), listPublishedPages(tenant)]);
  return (
    <>
      <Header tenant={tenant} brand={brand} pages={pages} />
      {children}
    </>
  );
}

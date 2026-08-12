import type { Data } from "@measured/puck";
import { getPublishedPage, getBrand } from "@/lib/vula-pages";
import PuckRender from "@/components/PuckRender";

export const revalidate = 30;

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const page = await getPublishedPage(tenant, "home");
  return { title: page?.seo?.title || page?.title || tenant };
}

// Homepage takeover, generalized from off_the_hook/src/app/page.tsx: if the owner has
// PUBLISHED a page with slug "home" in the Vula page builder, it becomes the site's homepage —
// no deploy needed, works for every tenant identically (off_the_hook's version of this only
// worked for that one tenant; every other tenant had no equivalent at all before this app).
export default async function TenantHomePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const [page, brand] = await Promise.all([getPublishedPage(tenant, "home"), getBrand(tenant)]);
  if (page) {
    return <PuckRender tenantId={tenant} data={page.puck_data as unknown as Data}
      theme={{ accent: brand.accent_color, ink: brand.ink_color }} />;
  }
  return (
    <main className="min-h-screen flex items-center justify-center px-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold mb-2">This store hasn&apos;t published a homepage yet</h1>
        <p className="text-gray-500">Build one in the Vula dashboard&apos;s Storefront tab, then publish it.</p>
      </div>
    </main>
  );
}

import { notFound } from "next/navigation";
import type { Data } from "@measured/puck";
import { getPublishedPage, getTenantInfo } from "@/lib/vula-pages";
import PuckRender from "@/components/PuckRender";

export const revalidate = 30;

export async function generateMetadata({ params }: { params: Promise<{ tenant: string; slug: string }> }) {
  const { tenant, slug } = await params;
  const page = await getPublishedPage(tenant, slug);
  return {
    title: page?.seo?.title || page?.title || tenant,
    description: page?.seo?.description || undefined,
  };
}

export default async function TenantPage({ params }: { params: Promise<{ tenant: string; slug: string }> }) {
  const { tenant, slug } = await params;
  const [page, info] = await Promise.all([getPublishedPage(tenant, slug), getTenantInfo(tenant)]);
  if (!page) notFound();
  return <PuckRender tenantId={tenant} data={page.puck_data as unknown as Data} theme={info.theme} />;
}

"use client";

import { useEffect } from "react";
import { Render, type Data } from "@measured/puck";
import config, { VULA_PUCK_STYLES } from "@/puck.config";

const VULA_API = process.env.NEXT_PUBLIC_VULA_API_URL || "https://vula-group-production.up.railway.app";

/** Renders a published Vula page, injecting the tenant's brand as CSS variables so blocks
 *  render in this store's colours (brand flow-through). Also sets the globals the live
 *  product blocks read (window.__VULA_PAGE_TENANT/__VULA_API). Ported from
 *  off_the_hook/src/components/PuckRender.tsx — the only change is taking tenantId as a prop
 *  (resolved per-request by middleware.ts) instead of a single hardcoded env var, since this
 *  app serves every tenant, not just one. */
export default function PuckRender({ tenantId, data, theme }: { tenantId: string; data: Data; theme?: Record<string, string> }) {
  useEffect(() => {
    const w = window as unknown as Record<string, string>;
    w.__VULA_PAGE_TENANT = tenantId;
    w.__VULA_API = VULA_API;
  }, [tenantId]);
  const vars: Record<string, string> = {};
  if (theme?.accent) vars["--brand-accent"] = theme.accent;
  if (theme?.ink) vars["--brand-ink"] = theme.ink;
  if (theme?.accent_fg) vars["--brand-accent-fg"] = theme.accent_fg;
  return (
    <div style={vars as React.CSSProperties}>
      <style>{VULA_PUCK_STYLES}</style>
      <Render config={config} data={data} />
    </div>
  );
}

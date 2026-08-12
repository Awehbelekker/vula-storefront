/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Generic multi-tenant app — images come from whichever host each tenant uploaded to
    // (Vula's own Supabase storage, or a URL the owner typed into the editor). Unlike a
    // single-tenant site, there's no fixed hostname list to allowlist ahead of time.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    optimizePackageImports: ["@measured/puck"],
  },
};

module.exports = nextConfig;

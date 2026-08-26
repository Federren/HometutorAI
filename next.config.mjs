/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // @resvg/resvg-js is a native (N-API) module — keep it out of the webpack
    // bundle so its platform binary loads correctly in the serverless runtime.
    serverComponentsExternalPackages: ["@resvg/resvg-js", "mathjax-full"],
    // Force-include the diagram label fonts in the webhook's serverless bundle;
    // file tracing can't detect the runtime fs.readFileSync path on its own.
    outputFileTracingIncludes: {
      "/api/webhook": ["./lib/fonts/**"],
      "/api/admin/diagram-test": ["./lib/fonts/**"],
    },
  },
  // Serve the finalized static holding page at the site root. A beforeFiles
  // rewrite runs ahead of the app router, so `/` returns public/home.html
  // (self-contained: inline CSS/JS, embedded images, EN/HE/AR toggle) while
  // every /api/* backend route is untouched.
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', destination: '/home.html' },
      ],
    }
  },
}

export default nextConfig;

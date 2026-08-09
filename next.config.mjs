/** @type {import('next').NextConfig} */
const nextConfig = {
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

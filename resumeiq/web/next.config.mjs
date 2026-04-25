/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/(.*)",
        headers: [
          {
            // Firebase signInWithPopup needs to read window.closed on the popup.
            // "same-origin" (Next.js default) blocks cross-origin popup communication.
            // "same-origin-allow-popups" keeps isolation while allowing Firebase auth popups.
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

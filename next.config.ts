import type { NextConfig } from "next";

/**
 * Response security headers. Applied to every route via `headers()`.
 *
 * The CSP is intentionally permissive in two places:
 *   - script-src includes 'unsafe-inline' because Next 16 ships a runtime-
 *     manifest inline script and `next-themes` injects a no-flash inline
 *     script. A nonce-based CSP would require migrating those.
 *   - style-src includes 'unsafe-inline' because Tailwind v4 + shadcn use
 *     inline styles for theme tokens and CSS-in-JS surfaces (motion).
 *
 * Everything else is locked down: no eval, no plugins, frame-ancestors
 * 'none' (Strata is never embedded), strict referrer + permissions policy.
 */
const cspDirectives: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'", "https://va.vercel-scripts.com"],
  "script-src-elem": [
    "'self'",
    "'unsafe-inline'",
    "https://va.vercel-scripts.com",
  ],
  "style-src": [
    "'self'",
    "'unsafe-inline'",
    "https://fonts.googleapis.com",
  ],
  "style-src-elem": [
    "'self'",
    "'unsafe-inline'",
    "https://fonts.googleapis.com",
  ],
  "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    "https://cdn.simpleicons.org",
  ],
  "connect-src": [
    "'self'",
    // Anthropic — only ever called server-side, but listing it makes the
    // intent explicit and lets a future client-side SDK call work.
    "https://api.anthropic.com",
    // BetterAuth same-origin only, no extra hosts needed.
  ],
  "frame-ancestors": ["'none'"],
  "frame-src": ["'none'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "worker-src": ["'self'", "blob:"],
  "manifest-src": ["'self'"],
};

function buildCsp(): string {
  return Object.entries(cspDirectives)
    .map(([key, vals]) => `${key} ${vals.join(" ")}`)
    .join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: buildCsp() },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "camera=()",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "payment=()",
      "usb=()",
      "interest-cohort=()",
    ].join(", "),
  },
];

// HSTS only in production — sending it during local HTTPS testing or on
// preview deploys can lock the browser into HTTPS for the dev domain.
if (process.env.NODE_ENV === "production") {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "pg-native"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

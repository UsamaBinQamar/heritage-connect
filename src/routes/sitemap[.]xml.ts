import { createFileRoute } from "@tanstack/react-router";

import { absoluteUrl } from "@/lib/seo";

/** Public, indexable marketing routes plus the public start of the application. */
const PUBLIC_PATHS = [
  { path: "/", priority: "1.0" },
  { path: "/about", priority: "0.8" },
  { path: "/how-it-works", priority: "0.8" },
  { path: "/membership", priority: "0.7" },
  { path: "/contact", priority: "0.6" },
  { path: "/apply", priority: "0.9" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PUBLIC_PATHS.map(
  (entry) =>
    `  <url>\n    <loc>${absoluteUrl(entry.path)}</loc>\n    <priority>${entry.priority}</priority>\n  </url>`,
).join("\n")}
</urlset>
`;

        return new Response(body, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});

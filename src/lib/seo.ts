/**
 * Canonical origin for public search-engine and social metadata.
 * Production domain: https://motherlandmatch.com (no trailing slash).
 */
export const SITE_ORIGIN = "https://motherlandmatch.com";

/** 1200x630 share card cut from the approved hero photograph (public/og-image.jpg). */
export const OG_IMAGE = `${SITE_ORIGIN}/og-image.jpg`;

export function absoluteUrl(path: string) {
  return `${SITE_ORIGIN}${path}`;
}

/** Meta + link tags shared by every indexable public page. */
export function publicPageHead(opts: {
  path: string;
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
}) {
  const url = absoluteUrl(opts.path);
  const ogTitle = opts.ogTitle ?? opts.title;
  const ogDescription = opts.ogDescription ?? opts.description;

  return {
    meta: [
      { title: opts.title },
      { name: "description", content: opts.description },
      { name: "robots", content: "index, follow" },
      { property: "og:site_name", content: "MotherlandMatch" },
      { property: "og:title", content: ogTitle },
      { property: "og:description", content: ogDescription },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "A couple in quiet conversation in a private, wood-panelled room",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: ogTitle },
      { name: "twitter:description", content: ogDescription },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

export type SocialMetadataInput = {
  title: string;
  description: string;
  /** Path of the page on this site, such as "/software/pipedrive". Resolved against metadataBase. */
  path: string;
  type?: "website" | "article";
};

/**
 * Open Graph and Twitter card fields built from one title and one description,
 * so the two can never disagree.
 *
 * Next.js replaces nested metadata objects instead of merging them. A page that
 * sets only `openGraph.title` and `openGraph.description` therefore loses the
 * root layout's site name, locale and type, and inherits the root layout's
 * `twitter` text for every other field: on 1,704 pages the Twitter card said
 * "Miloosh — Software research you can verify." while the Open Graph card
 * described the page.
 */
export function socialMetadata({ title, description, path, type = "website" }: SocialMetadataInput): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: { title, description, url: path, siteName: SITE_NAME, locale: "en_US", type },
    twitter: { card: "summary_large_image", title, description },
  };
}

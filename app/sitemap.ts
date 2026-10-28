import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

// The pages worth finding. /game is left out: it only shows a game started from the home page.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/instructions`, changeFrequency: "monthly", priority: 0.8 },
  ]
}

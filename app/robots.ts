import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

// Everyone may crawl, AI crawlers included (named so the intent is explicit). The game page keeps itself out of the
// index with a noindex tag instead (app/game/layout.tsx): blocking it here would stop crawlers seeing that tag.
const AI_CRAWLERS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot-Extended", "CCBot"]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: AI_CRAWLERS, allow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}

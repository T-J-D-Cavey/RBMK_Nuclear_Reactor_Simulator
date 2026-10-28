import type { MetadataRoute } from "next"
import { SITE_DESCRIPTION, SITE_NAME, THEME_COLOR } from "@/lib/site"

// Saved to a phone's home screen (or installed from Chrome/Edge), the game opens full screen without browser bars,
// like an app. Every page has its own way back to the main menu, so nothing needs the browser's buttons.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SITE_NAME,
    short_name: "RBMK",
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: THEME_COLOR,
    theme_color: THEME_COLOR,
    lang: "en-GB",
    categories: ["games", "education"],
    icons: [
      { src: "/rbmk_favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}

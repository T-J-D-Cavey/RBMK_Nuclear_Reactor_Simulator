// Where the site lives and how it describes itself to search engines, link previews and AI crawlers. None of this is
// shown on the pages. Moving to a custom domain means changing SITE_URL here (and redirecting the old address).
export const SITE_URL = "https://rbmk-simulator.vercel.app"
export const SITE_NAME = "RBMK Nuclear Reactor Simulation"
// The home page's browser tab title; other pages read "<page> | RBMK Nuclear Reactor Simulation" (TITLE_TEMPLATE)
export const SITE_TITLE = "RBMK Nuclear Reactor Simulation Game"
export const TITLE_TEMPLATE = `%s | ${SITE_NAME}`
// The phone's browser bar and the installed app's splash screen: black, like the footer and the control room
export const THEME_COLOR = "#000000"
export const SITE_DESCRIPTION =
  "Free browser game: run Chernobyl's Unit 4 RBMK reactor in real time. Meet power targets, survive emergencies, avoid a meltdown, and replay the 1986 safety test."
export const AUTHOR_NAME = "T-J-D-Cavey"
export const AUTHOR_URL = "https://github.com/T-J-D-Cavey"
export const SOURCE_URL = "https://github.com/T-J-D-Cavey/RBMK_Nuclear_Reactor_Simulator"

// Shared by every page's Open Graph tags: a page that sets its own openGraph replaces the layout's whole object, and
// loses app/opengraph-image.png with it, so the image is named here too
export const BASE_OPEN_GRAPH = {
  type: "website",
  siteName: SITE_NAME,
  locale: "en_GB",
  images: {
    url: "/opengraph-image.png",
    width: 1200,
    height: 630,
    alt: "RBMK Nuclear Reactor Control Simulation: a green CRT title screen above a Soviet control room console, with Start Game and How to Play buttons",
  },
} as const

// schema.org description of the game, embedded as JSON-LD in the layout
export const GAME_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  image: `${SITE_URL}/opengraph-image.png`,
  genre: ["Simulation", "Strategy", "Educational"],
  gamePlatform: "Web browser",
  applicationCategory: "Game",
  operatingSystem: "Any (runs in a web browser)",
  playMode: "SinglePlayer",
  inLanguage: "en",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: 0, priceCurrency: "GBP" },
  author: { "@type": "Person", name: AUTHOR_NAME, url: AUTHOR_URL },
  codeRepository: SOURCE_URL,
  about: { "@type": "Event", name: "Chernobyl disaster", startDate: "1986-04-26" },
}

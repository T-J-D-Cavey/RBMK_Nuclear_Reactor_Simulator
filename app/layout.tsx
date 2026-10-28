import type React from "react"
import type { Metadata, Viewport } from "next"
import { Barlow_Condensed, Geist, Geist_Mono, Special_Elite, VT323 } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { BASE_OPEN_GRAPH, GAME_JSON_LD, SITE_DESCRIPTION, SITE_TITLE, SITE_URL, THEME_COLOR, TITLE_TEMPLATE } from "@/lib/site"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
// The alarm monitor's 80s terminal lettering (.ws5-crt-text)
const terminalFont = VT323({ weight: "400", subsets: ["latin"], variable: "--font-terminal" })
// Engraved nameplates and key legends on the control panels (.cr-plate, .cr-key)
const plateFont = Barlow_Condensed({ weight: ["500", "600", "700"], subsets: ["latin"], variable: "--font-plate" })
// Typewritten paperwork on the panels (.cr-typed)
const typedFont = Special_Elite({ weight: "400", subsets: ["latin"], variable: "--font-typed" })

// Everything here is for search engines and link previews; pages override the canonical and Open Graph URL
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: TITLE_TEMPLATE },
  description: SITE_DESCRIPTION,
  // The name under the icon when saved to an iPhone home screen (app/manifest.ts does the rest)
  appleWebApp: { title: "RBMK", statusBarStyle: "black" },
  alternates: { canonical: "/" },
  openGraph: { ...BASE_OPEN_GRAPH, url: "/", title: SITE_TITLE, description: SITE_DESCRIPTION },
  twitter: { card: "summary_large_image" },
  // Google Search Console ownership check
  verification: { google: "6Z67PtWZjKVFigXtHZp3zz3cfyRkmFq5TwVttWlobS4" },
  icons: {
    icon: [
      { url: "/rbmk_favicon.svg", type: "image/svg+xml" },
      { url: "/rbmk_favicon.png", type: "image/png", sizes: "96x96" },
    ],
    apple: { url: "/apple-icon.png", sizes: "180x180" },
  }
}

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${terminalFont.variable} ${plateFont.variable} ${typedFont.variable} font-sans antialiased min-w-[340px]`}>
        {children}
        <div className="text-sm text-reactor-green font-[family-name:var(--font-plate)] font-semibold uppercase tracking-[0.16em] py-3 bg-black text-center">
          <a 
            href="https://github.com/T-J-D-Cavey" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-sm hover:underline cursor-pointer"
          >
            {"© 1986 SKALA CONTROL SYSTEMS"}
          </a>
        </div>
        <Analytics />
        {/* What the game is, for search engines and AI crawlers (not rendered) */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(GAME_JSON_LD) }} />
      </body>
    </html>
  )
}

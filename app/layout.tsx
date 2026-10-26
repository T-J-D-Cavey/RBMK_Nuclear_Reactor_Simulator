import type React from "react"
import type { Metadata } from "next"
import { Barlow_Condensed, Geist, Geist_Mono, VT323 } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
// The alarm monitor's 80s terminal lettering (.ws5-crt-text)
const terminalFont = VT323({ weight: "400", subsets: ["latin"], variable: "--font-terminal" })
// Engraved nameplates and key legends on the control panels (.cr-plate, .cr-key)
const plateFont = Barlow_Condensed({ weight: ["500", "600", "700"], subsets: ["latin"], variable: "--font-plate" })

export const metadata: Metadata = {
  title: "RBMK Nuclear Reactor Simulation",
  description: "Manage a nuclear reactor in real-time. Control the forces involved to meet power targets and avoid a nuclear disaster",
  // The "core lid": the RBMK reactor's circle of channel caps in the title's phosphor green
  icons: {
    icon: [
      { url: "/rbmk_favicon.svg", type: "image/svg+xml" },
      { url: "/rbmk_favicon.png", type: "image/png", sizes: "96x96" },
    ],
    apple: { url: "/apple-icon.png", sizes: "180x180" },
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${terminalFont.variable} ${plateFont.variable} font-sans antialiased min-w-[340px]`}>
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
      </body>
    </html>
  )
}

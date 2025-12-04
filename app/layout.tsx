import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "RBMK Nuclear Reactor Simulation",
  description: "Manage a nuclear reactor in real-time. Control the forces involved to meet power targets and avoid a nuclear disaster",
  icons: {
    icon: [
      {
        url: "/rbmk_favicon.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/rbmk_favicon.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/rbmk_favicon.png",
        type: "image/svg+xml",
      },
    ],
    apple: "/rbmk_favicon.png",
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
      <body className={`font-sans antialiased min-w-[340px]`}>
        {children}
        <div className="text-sm text-reactor-blue font-mono py-3 bg-black text-center">
          <a 
            href="https://github.com/T-J-D-Cavey" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xs hover:underline cursor-pointer"
          >
            {"© 1986 SKALA CONTROL SYSTEMS"}
          </a>
        </div>
        <Analytics />
      </body>
    </html>
  )
}

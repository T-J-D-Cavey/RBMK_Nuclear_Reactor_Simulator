import type { Metadata } from "next"
import type { ReactNode } from "react"

// The game page has nothing to read until a game is started from the home page, so keep it out of search results
export const metadata: Metadata = {
  title: "Control Room",
  robots: { index: false, follow: true },
  alternates: { canonical: "/game" },
}

export default function GameLayout({ children }: { children: ReactNode }) {
  return children
}

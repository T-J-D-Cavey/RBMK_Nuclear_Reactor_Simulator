"use client"

import { useEffect, useState } from "react"

// An element's current height in px (border box), kept up to date as it resizes; null until it has been measured.
// Pass the returned callback as the element's ref, so it works for elements that mount later.
export function useElementHeight<T extends HTMLElement>(): [(element: T | null) => void, number | null] {
  const [element, setElement] = useState<T | null>(null)
  const [height, setHeight] = useState<number | null>(null)

  useEffect(() => {
    if (!element || typeof ResizeObserver === "undefined") return
    const measure = () => setHeight(Math.round(element.getBoundingClientRect().height))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])

  return [setElement, height]
}

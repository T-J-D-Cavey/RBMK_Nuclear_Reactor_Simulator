"use client"

import { useEffect, useState } from "react"

interface Size {
  width: number
  height: number
}

// An element's (HTML or SVG) current size in px (border box), kept up to date as it resizes; null until it has been measured.
// Pass the returned callback as the element's ref, so it works for elements that mount later.
export function useElementSize<T extends Element>(): [(element: T | null) => void, Size | null] {
  const [element, setElement] = useState<T | null>(null)
  const [size, setSize] = useState<Size | null>(null)

  useEffect(() => {
    if (!element || typeof ResizeObserver === "undefined") return
    const measure = () => {
      const box = element.getBoundingClientRect()
      const next = { width: Math.round(box.width), height: Math.round(box.height) }
      setSize((prev) => (prev && prev.width === next.width && prev.height === next.height ? prev : next))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])

  return [setElement, size]
}

// Just the height
export function useElementHeight<T extends HTMLElement>(): [(element: T | null) => void, number | null] {
  const [ref, size] = useElementSize<T>()
  return [ref, size?.height ?? null]
}

// The window's inner height in px, kept up to date as it resizes; null until mounted.
export function useViewportHeight(): number | null {
  const [height, setHeight] = useState<number | null>(null)
  useEffect(() => {
    const measure = () => setHeight(window.innerHeight)
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])
  return height
}

// Whether a media query matches, kept up to date; false until mounted.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const list = window.matchMedia(query)
    const update = () => setMatches(list.matches)
    update()
    list.addEventListener("change", update)
    return () => list.removeEventListener("change", update)
  }, [query])
  return matches
}

// The top offset for a column pinned while the page scrolls (position: sticky). A column taller than the window
// pins by its bottom edge instead, so none of it is ever out of reach.
export function usePinnedTop<T extends HTMLElement>(margin = 16): [(element: T | null) => void, number] {
  const [ref, height] = useElementHeight<T>()
  const viewport = useViewportHeight()
  return [ref, height && viewport ? Math.min(margin, viewport - height - margin) : margin]
}

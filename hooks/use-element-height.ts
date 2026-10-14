"use client"

import { useEffect, useState } from "react"

interface Size {
  width: number
  height: number
}

// An element's current size in px (border box), kept up to date as it resizes; null until it has been measured.
// Pass the returned callback as the element's ref, so it works for elements that mount later.
export function useElementSize<T extends HTMLElement>(): [(element: T | null) => void, Size | null] {
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

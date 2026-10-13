import { useEffect, useState, type RefObject } from 'react'

export function useClickOutside<T extends HTMLElement>(
  refs: RefObject<T | null>[],
  onOutside: () => void,
  active = true,
) {
  useEffect(() => {
    if (!active) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      const inside = refs.some((r) => r.current?.contains(target))
      if (!inside) onOutside()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOutside()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', key)
    }
  }, [refs, onOutside, active])
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}

/** Locks body scroll while an overlay is open (mobile drawer / modal). */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [locked])
}
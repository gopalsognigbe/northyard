import { useEffect, useRef, useState } from 'react'
import './scroll-cursor.css'

const INTERACTIVE = 'a, button, input, textarea, select, label, [role="button"]'
const CARD = '.ask-sticker, .ask-film'

function canUseCustomCursor() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function ScrollCursor({ label = 'Descendez' }) {
  const [enabled, setEnabled] = useState(false)
  const root = useRef(null)
  const pos = useRef({ x: 0, y: 0 })
  const target = useRef({ x: 0, y: 0 })
  const mode = useRef('scroll')
  const surface = useRef('page')
  const visible = useRef(false)
  const raf = useRef(0)

  useEffect(() => {
    setEnabled(canUseCustomCursor())
  }, [])

  useEffect(() => {
    if (!enabled) return undefined

    const el = root.current
    const site = document.querySelector('.site')
    if (!el || !site) return undefined

    site.classList.add('has-custom-cursor')

    const lerp = (a, b, t) => a + (b - a) * t

    const paint = () => {
      pos.current.x = lerp(pos.current.x, target.current.x, 0.2)
      pos.current.y = lerp(pos.current.y, target.current.y, 0.2)
      el.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`
      raf.current = requestAnimationFrame(paint)
    }

    const setMode = (next) => {
      if (mode.current === next) return
      mode.current = next
      el.dataset.mode = next
    }

    const setSurface = (next) => {
      if (surface.current === next) return
      surface.current = next
      el.dataset.surface = next
    }

    const onMove = (event) => {
      target.current.x = event.clientX
      target.current.y = event.clientY
      if (!visible.current) {
        visible.current = true
        el.classList.add('is-visible')
        pos.current.x = event.clientX
        pos.current.y = event.clientY
      }

      const node = event.target instanceof Element ? event.target : null
      const hit = node?.closest(INTERACTIVE) ?? null
      const onCard = Boolean(node?.closest(CARD))
      setMode(hit ? 'link' : 'scroll')
      setSurface(onCard ? 'card' : 'page')
    }

    const onLeave = () => {
      visible.current = false
      el.classList.remove('is-visible')
    }

    raf.current = requestAnimationFrame(paint)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', onLeave)

    return () => {
      site.classList.remove('has-custom-cursor')
      cancelAnimationFrame(raf.current)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div
      ref={root}
      className="scroll-cursor"
      data-mode="scroll"
      data-surface="page"
      aria-hidden="true"
    >
      <span className="scroll-cursor__lie">
        <span className="scroll-cursor__lie-label">{label}</span>
        <span className="scroll-cursor__lie-stack">
          <span className="scroll-cursor__lie-chevron" />
          <span className="scroll-cursor__lie-chevron" />
        </span>
      </span>
      <span className="scroll-cursor__link-dot" />
    </div>
  )
}

import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)

const INTRO_PLAYBACK_RATE = 2

function unlockFilm(film) {
  let unlocked = false
  const unlock = async () => {
    if (unlocked) return
    unlocked = true
    try {
      film.muted = true
      await film.play()
      film.pause()
    } catch {
      unlocked = false
    }
  }
  return unlock
}

function clipAlpha(p, start, end, fade, first, last) {
  const inStart = first ? 0 : start - fade / 2
  const inEnd = first ? start : start + fade / 2
  if (p < inStart) return 0
  if (p < inEnd) return (p - inStart) / Math.max(0.001, inEnd - inStart)
  if (last) return 1
  const outStart = end - fade / 2
  const outEnd = end + fade / 2
  if (p < outStart) return 1
  if (p < outEnd) return 1 - (p - outStart) / Math.max(0.001, outEnd - outStart)
  return 0
}

function localTime(p, start, end, duration) {
  const u = Math.min(1, Math.max(0, (p - start) / Math.max(0.001, end - start)))
  return u * duration
}

function bottleLane(p) {
  if (p < 1 / 3) return 'center'
  if (p < 2 / 3) return 'right'
  return 'left'
}

function copyLane(p) {
  return bottleLane(p) === 'left' ? 'right' : 'left'
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function smoothstep(t) {
  const u = Math.min(1, Math.max(0, t))
  return u * u * (3 - 2 * u)
}

function filmTravel(t) {
  const hold = 0.1
  const rest = 0.82
  if (t <= hold) return 0
  if (t >= rest) return 1
  return smoothstep((t - hold) / (rest - hold))
}

function bottleCenterVw(p) {
  const offset = 26
  if (p < 1 / 3) return 0
  if (p < 2 / 3) return lerp(0, offset, filmTravel((p - 1 / 3) / (1 / 3)))
  return lerp(offset, -offset, filmTravel((p - 2 / 3) / (1 / 3)))
}

function setLane(el, lane, align) {
  if (!el) return
  el.classList.toggle('is-left', lane === 'left')
  el.classList.toggle('is-right', lane === 'right')
  if (align === 'end') el.style.textAlign = lane === 'right' ? 'right' : 'left'
  if (align === 'inner') el.style.textAlign = lane === 'left' ? 'right' : 'left'
}

function setDepthNote(el, p, visible) {
  const peak = Number(el.dataset.peak)
  const side = el.dataset.side === 'right' ? 'right' : 'left'
  const span = 0.2
  const t = (p - peak) / (span * 0.5)
  const d = Math.min(1.35, Math.max(-1.15, t))
  const approach = Math.min(1, Math.max(0, (d + 1.15) / 2.3))
  let opacity = 0
  if (visible && d > -1.05) {
    if (d < 0) opacity = Math.min(1, (d + 1.05) / 0.42)
    else opacity = Math.max(0, 1 - d / 1.05)
  }
  const narrow = window.matchMedia('(max-width: 860px)').matches
  const scale = narrow ? 0.72 + approach * 0.28 : 0.38 + approach * 0.62
  const rest = 18
  const far = 28
  const inner = rest + (far - rest) * (1 - approach)
  const xVw = narrow ? 0 : side === 'left' ? -inner : inner
  const yVh = narrow ? 22 : 6 + approach * 12
  if (!narrow) {
    const bottleX = bottleCenterVw(p)
    const bottleHalf = 14
    const gap = side === 'left' ? bottleX - bottleHalf - xVw : xVw - (bottleX + bottleHalf)
    if (gap < 5) opacity *= Math.max(0, gap / 5)
  }
  // Sur mobile, une seule note nette à la fois (évite la pile coincée)
  if (narrow && opacity > 0 && Math.abs(d) > 0.55) opacity *= 0.35
  setLane(el, side, 'inner')
  gsap.set(el, {
    left: '50%',
    right: 'auto',
    top: narrow ? '58%' : '42%',
    bottom: 'auto',
    xPercent: narrow ? -50 : side === 'left' ? -100 : 0,
    yPercent: -50,
    x: `${xVw}vw`,
    y: `${yVh}vh`,
    scale,
    autoAlpha: opacity,
    transformOrigin: narrow ? 'center center' : side === 'left' ? 'right center' : 'left center',
    force3D: true,
  })
}

export function useFilmScrub({ wrap, intro, video, spin, shift, lineA, hall, ask, reduced }) {
  useEffect(() => {
    const root = wrap.current
    const introEl = intro?.current ?? null
    const film = video.current
    const spinEl = spin?.current ?? null
    const shiftEl = shift?.current ?? null
    if (!root || !film) return undefined

    const nameEl = lineA?.current ?? null
    const nameWrap = nameEl?.parentElement ?? null
    const hallEl = hall?.current ?? null
    const notes = hallEl ? [...hallEl.querySelectorAll('.depth-note')] : []
    const askEl = ask?.current ?? null
    const clips = [
      { el: film, start: 0, end: 1 / 3, first: true, last: false },
      { el: spinEl, start: 1 / 3, end: 2 / 3, first: false, last: false },
      { el: shiftEl, start: 2 / 3, end: 1, first: false, last: true },
    ].filter((clip) => clip.el)

    if (reduced) {
      film.pause()
      if (introEl) {
        introEl.pause()
        gsap.set(introEl, { autoAlpha: 0 })
      }
      const last = shiftEl || spinEl || film
      gsap.set(film, { autoAlpha: last === film ? 1 : 0 })
      if (spinEl) gsap.set(spinEl, { autoAlpha: 0 })
      if (last && last !== film) {
        last.pause()
        const jump = () => {
          if (Number.isFinite(last.duration) && last.duration > 0) last.currentTime = last.duration
        }
        if (last.readyState >= 1) jump()
        else last.addEventListener('loadedmetadata', jump, { once: true })
        gsap.set(last, { autoAlpha: 1 })
      }
      if (nameWrap) gsap.set(nameWrap, { autoAlpha: 1 })
      else if (nameEl) gsap.set(nameEl, { autoAlpha: 1 })
      notes.forEach((el) => gsap.set(el, { autoAlpha: 0 }))
      if (askEl) {
        gsap.set(askEl, { autoAlpha: 1, clearProps: 'transform' })
        askEl.classList.add('is-live', 'is-center')
        askEl.classList.remove('is-left', 'is-right')
      }
      return undefined
    }

    const lenis = new Lenis({
      duration: 1.05,
      smoothWheel: true,
      touchMultiplier: 1.1,
      autoRaf: false,
    })

    let rafId = 0
    const loop = (time) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    lenis.on('scroll', ScrollTrigger.update)

    clips.forEach((clip) => gsap.set(clip.el, { autoAlpha: 0 }))
    if (introEl) gsap.set(introEl, { autoAlpha: 1 })
    notes.forEach((el) => gsap.set(el, { autoAlpha: 0 }))
    if (nameWrap) gsap.set(nameWrap, { autoAlpha: 0 })
    else if (nameEl) gsap.set(nameEl, { autoAlpha: 0 })
    if (askEl) {
      gsap.set(askEl, { autoAlpha: 0 })
      askEl.classList.remove('is-live')
      const sticker = askEl.querySelector('.ask-sticker')
      if (sticker) gsap.set(sticker, { rotation: -8, scale: 0.9, transformOrigin: '50% 18%' })
    }

    const durations = clips.map((clip) => clip.el.duration || 0)
    const FADE = 0.025

    let introDone = !introEl
    let introSafety = 0
    let stickerFloat = null
    let stickerLive = false
    const allowFloat =
      !reduced && !window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const setStickerFloat = (active) => {
      const sticker = askEl?.querySelector('.ask-sticker')
      const sheet = askEl?.querySelector('.ask-sticker__sheet')
      if (!sticker || !sheet || !allowFloat) return
      if (active && !stickerLive) {
        stickerLive = true
        sticker.classList.add('is-floating')
        stickerFloat?.kill()
        stickerFloat = gsap.to(sheet, {
          y: 5,
          rotation: 1.1,
          skewX: 0.35,
          duration: 2.7,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
          transformOrigin: '50% 8%',
        })
      } else if (!active && stickerLive) {
        stickerLive = false
        sticker.classList.remove('is-floating')
        stickerFloat?.kill()
        stickerFloat = null
        gsap.set(sheet, { y: 0, rotation: 0, skewX: 0 })
      }
    }

    const applyFrame = (p, live) => {
      const compact = window.matchMedia('(max-width: 1100px), (max-height: 820px)').matches
      const lane = compact ? 'center' : copyLane(p)
      const askShow = live ? Math.min(1, Math.max(0, (p - 0.78) / 0.1)) : 0
      const scrubClear = askShow > 0.08
      const pin = root.querySelector('.hero-pin')
      pin?.classList.toggle('is-asking', scrubClear)

      if (nameWrap) {
        setLane(nameWrap, compact ? 'left' : copyLane(p))
        if (!live || scrubClear) {
          gsap.set(nameWrap, { autoAlpha: 0 })
        } else {
          const hold = p < 0.2 ? 1 : Math.max(0, 1 - (p - 0.2) / 0.1)
          gsap.set(nameWrap, { autoAlpha: hold })
        }
      } else if (nameEl) {
        if (!live || scrubClear) gsap.set(nameEl, { autoAlpha: 0 })
        else {
          const hold = p < 0.2 ? 1 : Math.max(0, 1 - (p - 0.2) / 0.1)
          gsap.set(nameEl, { autoAlpha: hold })
        }
      }

      if (hallEl) gsap.set(hallEl, { autoAlpha: live && !scrubClear ? 1 : 0 })
      notes.forEach((el) => setDepthNote(el, p, live && !scrubClear && p < 0.78))
      if (askEl) {
        const sticker = askEl.querySelector('.ask-sticker')
        askEl.classList.toggle('is-left', lane === 'left')
        askEl.classList.toggle('is-right', lane === 'right')
        askEl.classList.toggle('is-center', lane === 'center')
        askEl.style.textAlign = lane === 'right' ? 'right' : 'left'
        gsap.set(askEl, { autoAlpha: askShow, x: 0, y: 0 })
        if (sticker) {
          const peel = askShow * askShow
          const mobileScale = compact ? 0.84 + peel * 0.1 : 0.9 + peel * 0.1
          gsap.set(sticker, {
            rotation: compact ? -3 + peel * 2.5 : -8 + peel * 5.5,
            scale: mobileScale,
            transformOrigin: '50% 18%',
            force3D: true,
          })
        }
        askEl.classList.toggle('is-live', askShow > 0.35)
        setStickerFloat(askShow > 0.55 && !compact)
      }
      clips.forEach((clip, i) => {
        if (!live) {
          gsap.set(clip.el, { autoAlpha: 0 })
          return
        }
        const alpha = clipAlpha(p, clip.start, clip.end, FADE, clip.first, clip.last)
        gsap.set(clip.el, { autoAlpha: alpha })
        if (alpha > 0.02 && durations[i] > 0) {
          const want = localTime(p, clip.start, clip.end, durations[i])
          if (Math.abs(clip.el.currentTime - want) > 0.04) clip.el.currentTime = want
        }
      })
      const hint = root.querySelector('.hero-hint')
      if (hint) {
        const showHint =
          live && !scrubClear && p < 0.14 ? 1 : live && !scrubClear ? Math.max(0, 1 - (p - 0.14) / 0.06) : 0
        gsap.set(hint, { autoAlpha: showHint })
      }
    }

    const finishIntro = () => {
      if (introDone) return
      introDone = true
      window.clearTimeout(introSafety)
      film.currentTime = 0
      film.pause()
      gsap.set(film, { autoAlpha: 0 })
      gsap.to(film, { autoAlpha: 1, duration: 0.28, ease: 'power2.out' })
      if (introEl) {
        gsap.to(introEl, {
          autoAlpha: 0,
          duration: 0.28,
          ease: 'power2.out',
          onComplete: () => introEl.pause(),
        })
      }
      if (nameWrap) gsap.set(nameWrap, { autoAlpha: 1 })
      else if (nameEl) gsap.set(nameEl, { autoAlpha: 1 })
      applyFrame(0, true)
      lenis.start()
      ScrollTrigger.refresh()
    }

    const syncIntroTitle = () => {
      if (!introEl || introDone) return
      const duration = introEl.duration || 1
      const t = introEl.currentTime / duration
      const alpha = Math.min(1, Math.max(0, (t - 0.2) / 0.4))
      if (nameWrap) gsap.set(nameWrap, { autoAlpha: alpha })
      else if (nameEl) gsap.set(nameEl, { autoAlpha: alpha })
    }

    lenis.stop()
    introSafety = window.setTimeout(finishIntro, 9000)

    const proxy = { t: 0 }
    const tween = gsap.to(proxy, {
      t: 1,
      ease: 'none',
      immediateRender: false,
      onUpdate: () => {
        if (!introDone) return
        applyFrame(proxy.t, true)
      },
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.4,
        invalidateOnRefresh: true,
      },
    })

    const onMeta = (index) => () => {
      durations[index] = clips[index].el.duration || 8
    }
    const metaHandlers = clips.map((clip, i) => {
      const handler = onMeta(i)
      if (clip.el.readyState >= 1) handler()
      else clip.el.addEventListener('loadedmetadata', handler)
      return handler
    })

    const refreshId = requestAnimationFrame(() => ScrollTrigger.refresh())
    const unlocks = clips.map((clip) => unlockFilm(clip.el))
    const introUnlock = introEl ? unlockFilm(introEl) : null

    const playIntro = async () => {
      if (!introEl || introDone) return
      try {
        introEl.playbackRate = INTRO_PLAYBACK_RATE
        introEl.currentTime = 0
        await introUnlock()
        await introEl.play()
      } catch {
        finishIntro()
      }
    }

    void playIntro()

    if (introEl) {
      introEl.addEventListener('timeupdate', syncIntroTitle)
      introEl.addEventListener('ended', finishIntro)
    }

    unlocks.forEach((unlock) => void unlock())
    const onPointer = () => {
      unlocks.forEach((unlock) => void unlock())
      if (introEl) void introUnlock?.()
      void playIntro()
    }
    window.addEventListener('pointerdown', onPointer, { once: true })
    window.addEventListener('keydown', onPointer, { once: true })

    const skipIntro = () => finishIntro()
    window.addEventListener('wheel', skipIntro, { passive: true, once: true })
    window.addEventListener('touchmove', skipIntro, { passive: true, once: true })

    return () => {
      window.clearTimeout(introSafety)
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onPointer)
      window.removeEventListener('wheel', skipIntro)
      window.removeEventListener('touchmove', skipIntro)
      if (introEl) {
        introEl.removeEventListener('timeupdate', syncIntroTitle)
        introEl.removeEventListener('ended', finishIntro)
      }
      clips.forEach((clip, i) => clip.el.removeEventListener('loadedmetadata', metaHandlers[i]))
      cancelAnimationFrame(rafId)
      cancelAnimationFrame(refreshId)
      tween.scrollTrigger?.kill()
      tween.kill()
      setStickerFloat(false)
      lenis.destroy()
    }
  }, [wrap, intro, video, spin, shift, lineA, hall, ask, reduced])
}

import { useMemo, useRef, useState } from 'react'
import '@fontsource/eb-garamond/400.css'
import '@fontsource/eb-garamond/400-italic.css'
import '@fontsource/eb-garamond/600.css'
import '@fontsource/eb-garamond/800.css'
import 'lenis/dist/lenis.css'
import { useFilmScrub } from './useFilmScrub.js'
import { AskSticker } from './AskSticker.jsx'
import './ask-sticker.css'
import './site.css'

const DEPTH_NOTES = [
  {
    peak: 0.1,
    side: 'left',
    title: 'Vendangé à la main',
    body: 'Schiste de Faugères. Mis en bouteille au domaine.',
  },
  {
    peak: 0.23,
    side: 'right',
    title: '2023',
    body: 'Rouge de Fontanille. 75 cl · 13,5% vol.',
  },
  {
    peak: 0.42,
    side: 'left',
    title: 'La colline a donné son nom à la cuvée.',
    body: 'On y entre peu, on y reste longtemps — le vin suit ce rythme.',
  },
  {
    peak: 0.54,
    side: 'left',
    title: 'Restanques de schiste',
    body: 'Les racines cherchent la faille. Le schiste casse la lumière.',
  },
  {
    peak: 0.68,
    side: 'left',
    title: 'Papier vergé, gravure, filet lie-de-vin.',
    body: 'L’étiquette ne dit rien d’autre.',
  },
]

function useReducedMotion() {
  return useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )
}

export function Site() {
  const wrap = useRef(null)
  const intro = useRef(null)
  const video = useRef(null)
  const spin = useRef(null)
  const shift = useRef(null)
  const lineA = useRef(null)
  const hall = useRef(null)
  const ask = useRef(null)
  const reduced = useReducedMotion()
  const [sent, setSent] = useState(false)

  useFilmScrub({ wrap, intro, video, spin, shift, lineA, hall, ask, reduced })

  return (
    <div className="site">
      <a className="skip" href="#allocation">
        Aller à la demande d’allocation
      </a>

      <header className="mast">
        <a className="wordmark" href="#top">
          Domaine Laclau
        </a>
        <a
          className="mast-cta"
          href="#allocation"
          onClick={(event) => {
            event.preventDefault()
            wrap.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
          }}
        >
          Demander une allocation
        </a>
      </header>

      <main id="top">
        <section
          ref={wrap}
          className={reduced ? 'hero hero-static' : 'hero'}
          aria-label="Fontanille, de la bouteille au schiste"
        >
          <div className="hero-pin">
            <div className="hero-stage">
              <video
                ref={intro}
              className="intro-film"
              src="/film/glissage.mp4?v=1"
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              aria-hidden="true"
            />
            <video
              ref={video}
              className="hero-film"
              src="/film/hero.mp4?v=1"
              poster="/film/hero-poster.jpg"
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              aria-hidden="true"
            />
            <video
              ref={spin}
              className="cuvee-film"
              src="/film/spin.mp4?v=1"
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              aria-hidden="true"
            />
            <video
              ref={shift}
              className="land-film"
              src="/film/shift.mp4?v=1"
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              aria-hidden="true"
            />
            </div>
            <div className="hero-copy">
              <p ref={lineA} className="hero-name">
                Fontanille
              </p>
            </div>
            <div ref={hall} className="depth-hall" aria-hidden={reduced ? true : undefined}>
              {DEPTH_NOTES.map((note) => (
                <article key={note.title} className="depth-note" data-peak={note.peak} data-side={note.side}>
                  <h2>{note.title}</h2>
                  <p>{note.body}</p>
                </article>
              ))}
            </div>
            {reduced ? (
              <ul className="depth-still">
                {DEPTH_NOTES.map((note) => (
                  <li key={note.title}>
                    <strong>{note.title}</strong>
                    <span>{note.body}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <aside ref={ask} className="ask-film" id="allocation" aria-labelledby="ask-title">
              <AskSticker variant="bordeaux" sent={sent} onSubmit={() => setSent(true)} />
            </aside>
            <p className="hero-hint">{reduced ? 'Faugères, Languedoc.' : 'Descendez.'}</p>
            <p className="pin-colophon">Domaine Laclau · Fontanille · AOP Faugères</p>
          </div>
        </section>
      </main>
    </div>
  )
}

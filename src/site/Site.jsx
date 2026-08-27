import { useMemo, useRef, useState } from 'react'
import '@fontsource/eb-garamond/400.css'
import '@fontsource/eb-garamond/400-italic.css'
import '@fontsource/eb-garamond/600.css'
import '@fontsource/eb-garamond/800.css'
import 'lenis/dist/lenis.css'
import { useFilmScrub } from './useFilmScrub.js'
import { AskSticker } from './AskSticker.jsx'
import { ScrollCursor } from './ScrollCursor.jsx'
import { useLocale } from './i18n.js'
import './ask-sticker.css'
import './site.css'

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
  const { locale, setLocale, copy } = useLocale()

  useFilmScrub({ wrap, intro, video, spin, shift, lineA, hall, ask, reduced })

  return (
    <div className="site">
      {!reduced ? <ScrollCursor label={copy.cursorScroll} /> : null}
      <a className="skip" href="#allocation">
        {copy.skip}
      </a>

      <header className="mast">
        <a className="wordmark" href="#top">
          Domaine Laclau
        </a>
        <div className="mast-end">
          <div className="lang" role="group" aria-label={locale === 'fr' ? 'Langue' : 'Language'}>
            <button
              type="button"
              className={locale === 'fr' ? 'lang__btn is-active' : 'lang__btn'}
              lang="fr"
              aria-pressed={locale === 'fr'}
              onClick={() => setLocale('fr')}
            >
              FR
            </button>
            <span className="lang__sep" aria-hidden="true">
              /
            </span>
            <button
              type="button"
              className={locale === 'en' ? 'lang__btn is-active' : 'lang__btn'}
              lang="en"
              aria-pressed={locale === 'en'}
              onClick={() => setLocale('en')}
            >
              EN
            </button>
          </div>
          <a
            className="mast-cta"
            href="#allocation"
            onClick={(event) => {
              event.preventDefault()
              wrap.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
            }}
          >
            {copy.mastCta}
          </a>
        </div>
      </header>

      <main id="top">
        <section
          ref={wrap}
          className={reduced ? 'hero hero-static' : 'hero'}
          aria-label={copy.heroAria}
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
              {copy.depthNotes.map((note) => (
                <article
                  key={`${note.peak}-${note.side}`}
                  className="depth-note"
                  data-peak={note.peak}
                  data-side={note.side}
                >
                  <h2>{note.title}</h2>
                  <p>{note.body}</p>
                </article>
              ))}
            </div>
            {reduced ? (
              <ul className="depth-still">
                {copy.depthNotes.map((note) => (
                  <li key={`${note.peak}-${note.side}`}>
                    <strong>{note.title}</strong>
                    <span>{note.body}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <aside ref={ask} className="ask-film" id="allocation" aria-labelledby="ask-title">
              <AskSticker variant="bordeaux" copy={copy.ask} sent={sent} onSubmit={() => setSent(true)} />
            </aside>
            <p className="hero-hint">{reduced ? copy.heroHintReduced : copy.heroHint}</p>
            <p className="pin-colophon">{copy.colophon}</p>
          </div>
        </section>
      </main>
    </div>
  )
}

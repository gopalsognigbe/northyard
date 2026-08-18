import { useEffect, useRef, useState } from 'react'
import '@fontsource/eb-garamond/400.css'
import '@fontsource/eb-garamond/400-italic.css'
import '@fontsource/eb-garamond/600.css'
import '@fontsource/eb-garamond/800.css'
import './apercu.css'

function unlock(film) {
  film.muted = true
  return film
    .play()
    .then(() => film.pause())
    .catch(() => {})
}

function Still({ src, alt, label, overlay }) {
  return (
    <figure className="still">
      <div className="still-stage">
        <img src={src} alt={alt} />
        {overlay}
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  )
}

function MixA() {
  const [mix, setMix] = useState(50)
  return (
    <div className="live">
      <div className="live-stage" aria-hidden="true">
        <img src="/apercu/p01-end.jpg" alt="" />
        <img src="/apercu/p02-start.jpg" alt="" style={{ opacity: mix / 100 }} />
        <p className="live-ghost">Fontanille</p>
      </div>
      <label className="scrub">
        <span>Fondu au raccord — {mix}%</span>
        <input
          type="range"
          min="0"
          max="100"
          value={mix}
          onChange={(event) => setMix(Number(event.target.value))}
        />
      </label>
      <p className="live-note">
        0% = dernière frame de <em>plan-01</em>. 100% = première frame de <em>plan-02</em>.
        Tu vois l’échelle sauter : ce n’est pas encore la même bouteille.
      </p>
    </div>
  )
}

function MixC() {
  const a = useRef(null)
  const b = useRef(null)
  const [t, setT] = useState(0)

  useEffect(() => {
    const va = a.current
    const vb = b.current
    if (!va || !vb) return undefined
    void unlock(va)
    void unlock(vb)
    const onPointer = () => {
      void unlock(va)
      void unlock(vb)
    }
    window.addEventListener('pointerdown', onPointer, { once: true })
    return () => window.removeEventListener('pointerdown', onPointer)
  }, [])

  const apply = (seconds) => {
    const va = a.current
    const vb = b.current
    if (!va || !vb) return
    if (seconds < 8) {
      va.style.opacity = '1'
      vb.style.opacity = '0'
      if (Math.abs(va.currentTime - seconds) > 0.04) va.currentTime = seconds
    } else {
      va.style.opacity = '0'
      vb.style.opacity = '1'
      const u = seconds - 8
      if (Math.abs(vb.currentTime - u) > 0.04) vb.currentTime = u
    }
  }

  return (
    <div className="live">
      <div className="live-stage">
        <video ref={a} src="/film/hero.mp4?v=plan01" muted playsInline preload="auto" />
        <video
          ref={b}
          src="/film/plan-02.mp4?v=spin"
          muted
          playsInline
          preload="auto"
          style={{ opacity: 0 }}
        />
      </div>
      <label className="scrub">
        <span>Un seul film — {t.toFixed(1)} s / 16 s{t >= 8 ? ' · raccord' : ''}</span>
        <input
          type="range"
          min="0"
          max="16"
          step="0.04"
          value={t}
          onChange={(event) => {
            const next = Number(event.target.value)
            setT(next)
            apply(next)
          }}
        />
      </label>
      <p className="live-note">
        Un viewport, un curseur, deux fichiers collés. Le cut à 8 s est exactement le saut
        d’échelle — il disparaît seulement si le départ de <em>plan-02</em> est recalé (B).
      </p>
    </div>
  )
}

export function Apercu() {
  return (
    <div className="apercu">
      <header className="apercu-mast">
        <p className="kicker">Lab · trois raccords</p>
        <h1>Même bouteille, section 2.</h1>
        <p className="lede">
          Images réelles de tes prises. Rien n’est encore branché sur le site. Dis A, B, A+B
          ou C.
        </p>
        <p className="nav">
          <a href="/">Site</a>
          <a href="/apercu/autocollant">Autocollant</a>
          <a href="#a">A</a>
          <a href="#b">B</a>
          <a href="#c">C</a>
        </p>
      </header>

      <article id="a" className="option">
        <header>
          <p className="opt">A · sans refilmer</p>
          <h2>Un plateau, fondu au passage.</h2>
          <p>
            Un seul sticky 100vh. Les deux mp4 s’empilent. Au raccord, fondu ~400 ms, le
            copy Fontanille sort, le 360 continue. Rapide. L’échelle saute encore.
          </p>
        </header>
        <MixA />
        <div className="strip">
          <Still
            src="/apercu/p01-end.jpg"
            alt="Fin du hero, bouteille centrée."
            label="1 · Fin hero — encore centrée"
            overlay={<span className="ov ov-hero">Fontanille</span>}
          />
          <Still
            src="/apercu/a-dissolve.jpg"
            alt="Fondu entre les deux prises."
            label="2 · Le fondu (deux échelles)"
          />
          <Still
            src="/apercu/p02-mid.jpg"
            alt="Dos de la bouteille pendant le 360."
            label="3 · 360 déjà en cours"
          />
          <Still
            src="/apercu/p02-end.jpg"
            alt="Bouteille à droite, place pour le texte."
            label="4 · Droite, textes à gauche"
            overlay={
              <span className="ov ov-copy">
                La colline a donné
                <br />
                son nom à la cuvée.
              </span>
            }
          />
        </div>
      </article>

      <article id="b" className="option">
        <header>
          <p className="opt">B · recommandé avec A</p>
          <h2>Recaler le départ, puis elle tourne.</h2>
          <p>
            Copie de <em>plan-02</em> : première frame = dernière de <em>plan-01</em> (même
            taille, même face, même place). Ensuite seulement le 360 et le glissement.
            Aperçu maquette : la case 2 n’est pas encore refilmée — c’est la fin de
            plan-01 tenue.
          </p>
        </header>
        <div className="strip">
          <Still
            src="/apercu/p01-end.jpg"
            alt="Dernière frame de plan-01."
            label="1 · Dernière frame plan-01"
            overlay={<span className="ov ov-hero">Fontanille</span>}
          />
          <Still
            src="/apercu/p01-end.jpg"
            alt="Maquette du départ recalé de plan-02."
            label="2 · Départ recalé (maquette)"
            overlay={<span className="ov ov-mark">même image</span>}
          />
          <Still
            src="/apercu/p02-mid.jpg"
            alt="Bouteille de dos pendant la rotation."
            label="3 · Le tour commence"
          />
          <Still
            src="/apercu/p02-end.jpg"
            alt="Bouteille à droite après le 360."
            label="4 · Elle n’a pas quitté le cadre"
            overlay={
              <span className="ov ov-copy">
                La colline a donné
                <br />
                son nom à la cuvée.
              </span>
            }
          />
        </div>
        <p className="live-note tight">
          Sans le refilm, tu as A. Avec le refilm, le fondu de A devient invisible : c’est
          un raccord, plus un mélange de deux bouteilles.
        </p>
      </article>

      <article id="c" className="option">
        <header>
          <p className="opt">C · un fichier</p>
          <h2>Une timeline, 16 secondes.</h2>
          <p>
            Les deux prises collées, un seul <code>currentTime</code>. C’est le geste
            Terminal. Glisse : à 8 s tu sens le cut. Il ne disparaît que si B a été filmé
            avant le collage.
          </p>
        </header>
        <MixC />
        <div className="ruler" aria-hidden="true">
          <span>0 s · hero</span>
          <span className="cut">8 s · raccord</span>
          <span>16 s · cuvée</span>
        </div>
      </article>
    </div>
  )
}

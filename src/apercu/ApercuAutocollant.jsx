import '@fontsource/eb-garamond/400.css'
import '@fontsource/eb-garamond/400-italic.css'
import '@fontsource/eb-garamond/600.css'
import '@fontsource/eb-garamond/800.css'
import { AskSticker } from '../site/AskSticker.jsx'
import '../site/ask-sticker.css'
import './apercu-autocollant.css'

function StickerScene({ variant, label, note }) {
  return (
    <figure className="sticker-scene">
      <div className="sticker-scene__stage">
        <img src="/apercu/bottle-still.png" alt="" />
        <div className={`sticker-scene__pin sticker-scene__pin--${variant}`}>
          <AskSticker variant={variant} preview floating />
        </div>
      </div>
      <figcaption>
        <strong>{label}</strong>
        <span>{note}</span>
      </figcaption>
    </figure>
  )
}

export function ApercuAutocollant() {
  return (
    <div className="apercu-autocollant">
      <header className="apercu-autocollant__mast">
        <p className="kicker">Lab · allocation</p>
        <h1>Autocollant sur le film.</h1>
        <p className="lede">
          Le formulaire arrive en bas du scrub, comme une étiquette posée sur la prise.
          Deux fonds : encre ou bordeaux. Le site embarque la variante bordeaux.
        </p>
        <p className="nav">
          <a href="/">Site</a>
        </p>
      </header>

      <section className="apercu-autocollant__grid">
        <StickerScene
          variant="ink"
          label="A · Encre"
          note="Plus sec, plus éditorial. Le bouton crème sur noir."
        />
        <StickerScene
          variant="bordeaux"
          label="B · Bordeaux — retenu"
          note="Lie-de-vin, capsule, filet d’étiquette. Chaleur sans cri."
        />
      </section>

      <section className="apercu-autocollant__detail">
        <h2>Ce qui compose l’autocollant</h2>
        <ul>
          <li>Scotch papier en tête, léger angle (−2,5°).</li>
          <li>Grain + coin plié pour la matière, ombre portée sur le film.</li>
          <li>Apparition en fin de scrub : rotation −8° → −2,5°, scale 0,9 → 1.</li>
        </ul>
      </section>
    </div>
  )
}

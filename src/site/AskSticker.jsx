export function AskSticker({ variant = 'bordeaux', sent, onSubmit, preview = false, floating = false }) {
  return (
    <div
      className={`ask-sticker ask-sticker--${variant}${preview ? ' is-preview' : ''}${floating ? ' is-floating' : ''}`}
    >
      <span className="ask-sticker__tape" aria-hidden="true" />
      <div className="ask-sticker__sheet">
        <div className="ask-sticker__body">
          <p className="ask-sticker__kicker">Allocation 2023</p>
          <h2 id="ask-title">Écrire pour la cave.</h2>
          <p className="ask-sticker__lede">
            Pas de vente en ligne. Dites-nous qui vous êtes — restaurant, cave, table
            privée — et nous revenons avec ce qui reste de 2023.
          </p>
          {sent ? (
            <p className="ask-sticker__done" role="status">
              C’est noté. Nous écrivons à l’adresse indiquée.
            </p>
          ) : (
            <form
              className="ask-sticker__form"
              onSubmit={
                preview
                  ? (event) => event.preventDefault()
                  : (event) => {
                      event.preventDefault()
                      onSubmit?.()
                    }
              }
            >
              <label>
                Nom
                <input name="name" type="text" autoComplete="name" required={!preview} tabIndex={preview ? -1 : 0} />
              </label>
              <label>
                Courriel
                <input name="email" type="email" autoComplete="email" required={!preview} tabIndex={preview ? -1 : 0} />
              </label>
              <label className="span">
                Maison
                <input name="house" type="text" placeholder="Cave, restaurant…" tabIndex={preview ? -1 : 0} />
              </label>
              <label className="span">
                Message
                <textarea name="note" rows={3} required={!preview} tabIndex={preview ? -1 : 0} />
              </label>
              <button type="submit" tabIndex={preview ? -1 : 0}>
                Envoyer la demande
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

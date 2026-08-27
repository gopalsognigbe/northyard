export function AskSticker({ variant = 'bordeaux', copy, sent, onSubmit }) {
  const strings = copy ?? {
    kicker: 'Allocation 2023',
    title: 'Écrire pour la cave.',
    lede:
      'Pas de vente en ligne. Dites-nous qui vous êtes — restaurant, cave, table privée — et nous revenons avec ce qui reste de 2023.',
    done: 'C’est noté. Nous écrivons à l’adresse indiquée.',
    name: 'Nom',
    email: 'Courriel',
    house: 'Maison',
    housePlaceholder: 'Cave, restaurant…',
    message: 'Message',
    submit: 'Envoyer la demande',
  }

  return (
    <div className={`ask-sticker ask-sticker--${variant}`}>
      <span className="ask-sticker__tape" aria-hidden="true" />
      <div className="ask-sticker__sheet">
        <div className="ask-sticker__body">
          <p className="ask-sticker__kicker">{strings.kicker}</p>
          <h2 id="ask-title">{strings.title}</h2>
          <p className="ask-sticker__lede">{strings.lede}</p>
          {sent ? (
            <p className="ask-sticker__done" role="status">
              {strings.done}
            </p>
          ) : (
            <form
              className="ask-sticker__form"
              onSubmit={(event) => {
                event.preventDefault()
                onSubmit?.()
              }}
            >
              <label>
                {strings.name}
                <input name="name" type="text" autoComplete="name" required />
              </label>
              <label>
                {strings.email}
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <label className="span">
                {strings.house}
                <input name="house" type="text" placeholder={strings.housePlaceholder} />
              </label>
              <label className="span">
                {strings.message}
                <textarea name="note" rows={3} required />
              </label>
              <button type="submit">{strings.submit}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

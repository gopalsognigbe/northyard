import { useCallback, useEffect, useMemo, useState } from 'react'

export const LOCALES = ['fr', 'en']
export const DEFAULT_LOCALE = 'fr'

export const messages = {
  fr: {
    metaDescription:
      'Domaine Laclau, cuvée Fontanille, AOP Faugères 2023. Allocation sur demande.',
    pageTitle: 'Domaine Laclau — Fontanille',
    skip: 'Aller à la demande d’allocation',
    mastCta: 'Demander une allocation',
    heroAria: 'Fontanille, de la bouteille au schiste',
    heroHint: 'Descendez.',
    heroHintReduced: 'Faugères, Languedoc.',
    colophon: 'Domaine Laclau · Fontanille · AOP Faugères',
    cursorScroll: 'Descendez',
    depthNotes: [
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
    ],
    ask: {
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
    },
  },
  en: {
    metaDescription:
      'Domaine Laclau, Fontanille cuvée, AOP Faugères 2023. Allocation by request.',
    pageTitle: 'Domaine Laclau — Fontanille',
    skip: 'Skip to allocation request',
    mastCta: 'Request an allocation',
    heroAria: 'Fontanille, from bottle to schist',
    heroHint: 'Scroll down.',
    heroHintReduced: 'Faugères, Languedoc.',
    colophon: 'Domaine Laclau · Fontanille · AOP Faugères',
    cursorScroll: 'Scroll',
    depthNotes: [
      {
        peak: 0.1,
        side: 'left',
        title: 'Hand-harvested',
        body: 'Faugères schist. Estate-bottled.',
      },
      {
        peak: 0.23,
        side: 'right',
        title: '2023',
        body: 'Fontanille red. 75 cl · 13.5% vol.',
      },
      {
        peak: 0.42,
        side: 'left',
        title: 'The hill gave the cuvée its name.',
        body: 'You enter sparingly and stay a long while — the wine keeps that pace.',
      },
      {
        peak: 0.54,
        side: 'left',
        title: 'Schist terraces',
        body: 'Roots seek the fault line. Schist breaks the light.',
      },
      {
        peak: 0.68,
        side: 'left',
        title: 'Laid paper, engraving, lees-coloured rule.',
        body: 'The label says nothing else.',
      },
    ],
    ask: {
      kicker: '2023 allocation',
      title: 'Write to the cellar.',
      lede:
        'No online sales. Tell us who you are — restaurant, wine shop, private table — and we will reply with what remains of 2023.',
      done: 'Noted. We will write to the address provided.',
      name: 'Name',
      email: 'Email',
      house: 'House',
      housePlaceholder: 'Wine shop, restaurant…',
      message: 'Message',
      submit: 'Send request',
    },
  },
}

function resolveLocale() {
  if (typeof window === 'undefined') return DEFAULT_LOCALE

  const params = new URLSearchParams(window.location.search)
  const fromUrl = params.get('lang')
  if (LOCALES.includes(fromUrl)) {
    localStorage.setItem('laclau-locale', fromUrl)
    return fromUrl
  }

  const stored = localStorage.getItem('laclau-locale')
  if (LOCALES.includes(stored)) return stored

  const browser = window.navigator.language?.slice(0, 2)
  if (LOCALES.includes(browser)) return browser

  return DEFAULT_LOCALE
}

export function useLocale() {
  const [locale, setLocaleState] = useState(resolveLocale)

  const setLocale = useCallback((next) => {
    if (!LOCALES.includes(next)) return
    setLocaleState(next)
    localStorage.setItem('laclau-locale', next)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
    const copy = messages[locale]
    document.title = copy.pageTitle
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content', copy.metaDescription)
  }, [locale])

  const copy = useMemo(() => messages[locale] ?? messages[DEFAULT_LOCALE], [locale])

  return { locale, setLocale, copy }
}

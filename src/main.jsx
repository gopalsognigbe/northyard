import { createRoot } from 'react-dom/client'

const root = document.getElementById('root')
const studio = /^\/studio\/?$/.test(window.location.pathname)

async function boot() {
  if (studio) {
    document.documentElement.classList.add('is-studio')
    document.title = 'Laclau — studio'
    const { Studio } = await import('./studio/Studio.jsx')
    await import('./studio/studio.css')
    createRoot(root).render(<Studio />)
    return
  }

  document.title = 'Domaine Laclau — Fontanille'
  const { Site } = await import('./site/Site.jsx')
  createRoot(root).render(<Site />)
}

void boot()

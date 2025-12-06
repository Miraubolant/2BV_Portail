/// <reference path="../../../adonisrc.ts" />
/// <reference path="../../../config/inertia.ts" />

import { StrictMode, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { createInertiaApp } from '@inertiajs/react'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import { AppWrapper } from '@/app/app-wrapper'

const appName = import.meta.env.VITE_APP_NAME || '2BV Portail'

// Type pour les composants de page avec layout persistant
type PageComponent = {
  default: React.ComponentType & {
    layout?: (page: ReactNode) => ReactNode
  }
}

createInertiaApp({
  title: (title) => `${title} - ${appName}`,

  resolve: async (name) => {
    const page = (await resolvePageComponent(
      `../pages/${name}.tsx`,
      import.meta.glob('../pages/**/*.tsx')
    )) as PageComponent

    // Si la page a un layout persistant, l'utiliser
    // Sinon, retourner la page telle quelle
    return page
  },

  setup({ el, App, props }) {
    createRoot(el).render(
      <StrictMode>
        <AppWrapper>
          <App {...props} />
        </AppWrapper>
      </StrictMode>
    )
  },

  progress: { color: '#171717' },
})

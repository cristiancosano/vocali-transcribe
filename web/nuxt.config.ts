import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
      title: 'Vocali Transcribe',
      link: [{ rel: 'icon', type: 'image/png', href: '/favicon.png' }]
    }
  },
  modules: ['nuxt-toast'],
  toast: {
    settings: {
      position: 'topRight',
      timeout: 4000,
      closeOnEscape: true,
      pauseOnHover: true
    }
  },
  css: ['~/assets/main.css'],
  vite: {
    plugins: [
      tailwindcss()
    ],
  },
  runtimeConfig: {
    public: {
      apiBase: '/api'
    }
  },
  nitro: {
    routeRules: {
      '/api/**': { 
        proxy: `${process.env.NUXT_API_ENDPOINT}/**` 
      },
    },
  },
})

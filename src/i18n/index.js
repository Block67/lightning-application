import { createI18n } from 'vue-i18n'
import fr from '@/locales/fr.json'
import en from '@/locales/en.json'

const saved = localStorage.getItem('sb_lang') || 'fr'

export const i18n = createI18n({
  legacy: false,
  locale: saved,
  fallbackLocale: 'fr',
  messages: { fr, en }
})

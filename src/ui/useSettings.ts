import { useCallback, useEffect, useState } from 'react'

import { resolveTheme } from '../core/preferences'
import type { LanguagePreference, Theme, ThemePreference } from '../core/settings'
import {
  loadSettings,
  markFirstRunSeen,
  setLanguagePreference,
  setThemePreference,
  type SettingsView,
} from '../app/settings'
import { createTranslator, type Translate } from '../i18n/messages'

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)'

/**
 * حالة الإعدادات في طبقة العرض.
 *
 * كل وصول إلى التخزين يمر عبر app؛ لا تستدعي ui طبقة storage أو browser مباشرة.
 * ما يُقرأ هنا مباشرة هو DOM فقط: تفضيل السمة في النظام، وتطبيق السمات على الجذر.
 */
export interface UseSettingsResult {
  ready: boolean
  view: SettingsView | undefined
  theme: Theme
  t: Translate
  changeLanguage: (language: LanguagePreference) => void
  changeTheme: (theme: ThemePreference) => void
  /** يسجّل أن شاشة أول تشغيل عُرضت، ويحدّث العرض فورًا فتنتقل الشاشة. */
  completeFirstRun: () => void
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia(DARK_SCHEME_QUERY).matches
}

export function useSettings(): UseSettingsResult {
  const [view, setView] = useState<SettingsView | undefined>(undefined)
  const [prefersDark, setPrefersDark] = useState(systemPrefersDark)

  useEffect(() => {
    let active = true
    void loadSettings().then((loaded) => {
      if (active) setView(loaded)
    })
    return () => {
      active = false
    }
  }, [])

  // تفضيل السمة في النظام قد يتغير أثناء التشغيل، فيُتابَع لا يُقرأ مرة واحدة.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const query = window.matchMedia(DARK_SCHEME_QUERY)
    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const theme: Theme = resolveTheme(view?.settings.theme ?? 'system', prefersDark)

  // اللغة والاتجاه والسمة تُطبَّق على العنصر الجذري، فيتغير RTL/LTR بنيويًا لا تجميليًا.
  useEffect(() => {
    if (view === undefined) return
    const root = document.documentElement
    root.setAttribute('lang', view.language)
    root.setAttribute('dir', view.direction)
    root.setAttribute('data-theme', theme)
  }, [view, theme])

  const changeLanguage = useCallback((language: LanguagePreference) => {
    void setLanguagePreference(language).then(setView)
  }, [])

  const changeTheme = useCallback((next: ThemePreference) => {
    void setThemePreference(next).then(setView)
  }, [])

  const completeFirstRun = useCallback(() => {
    void markFirstRunSeen().then(setView)
  }, [])

  return {
    ready: view !== undefined,
    view,
    theme,
    t: createTranslator(view?.language ?? 'en'),
    changeLanguage,
    changeTheme,
    completeFirstRun,
  }
}

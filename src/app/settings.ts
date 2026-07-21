/**
 * تنسيق قراءة الإعدادات وتحديثها.
 *
 * طبقة app طبقة تنسيق خفيفة: تجمع بين storage و browser و core ولا تضيف قواعد خاصة بها.
 * وهي الطبقة الوحيدة التي تستدعيها ui للوصول إلى التخزين أو المتصفح.
 */

import {
  directionForLanguage,
  resolveLanguage,
} from '../core/preferences'
import type {
  Direction,
  Language,
  LanguagePreference,
  Settings,
  ThemePreference,
} from '../core/settings'
import { getPreferredLanguages } from '../browser/environment'
import { patchSettings, readSettings } from '../storage/settings'

/**
 * الإعدادات المحفوظة مع ما اشتُق منها.
 *
 * السمة الفعلية غير محسوبة هنا عمدًا: تفضيل `system` يتغير أثناء التشغيل،
 * فتشتقه طبقة العرض من `prefers-color-scheme` عبر `resolveTheme`.
 */
export interface SettingsView {
  settings: Settings
  language: Language
  direction: Direction
}

function view(settings: Settings): SettingsView {
  const language = resolveLanguage(settings.language, getPreferredLanguages())
  return { settings, language, direction: directionForLanguage(language) }
}

export async function loadSettings(): Promise<SettingsView> {
  return view(await readSettings())
}

export async function setLanguagePreference(
  language: LanguagePreference,
): Promise<SettingsView> {
  return view(await patchSettings({ language }))
}

export async function setThemePreference(
  theme: ThemePreference,
): Promise<SettingsView> {
  return view(await patchSettings({ theme }))
}

/** يسجّل أن شاشة أول تشغيل عُرضت، فلا تعود بعدها. */
export async function markFirstRunSeen(): Promise<SettingsView> {
  return view(await patchSettings({ firstRunSeen: true }))
}

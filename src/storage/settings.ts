/**
 * حفظ إعدادات اللغة والسمة واسترجاعها.
 *
 * الإعدادات الصغيرة تسكن `chrome.storage.local`، وبيانات المنتج تسكن IndexedDB —
 * انظر docs/decisions/0007-storage.md
 *
 * هذه الطبقة لا تلمس `chrome.*` مباشرة؛ تمر عبر src/browser.
 */

import { DEFAULT_SETTINGS, normalizeSettings, type Settings } from '../core/settings'
import { readLocal, writeLocal } from '../browser/storage-area'

const SETTINGS_KEY = 'jusoor.settings'

/** يقرأ الإعدادات المحفوظة، ويعيد الافتراضي عند غيابها أو تلفها. */
export async function readSettings(): Promise<Settings> {
  const stored = await readLocal(SETTINGS_KEY)
  return normalizeSettings(stored)
}

/** يكتب الإعدادات بعد تطبيعها، فلا تُحفظ قيمة غير صالحة. */
export async function writeSettings(settings: Settings): Promise<Settings> {
  const normalized = normalizeSettings(settings)
  await writeLocal(SETTINGS_KEY, normalized)
  return normalized
}

/** يدمج تعديلًا جزئيًا مع المحفوظ حاليًا. */
export async function patchSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await readSettings()
  return writeSettings({ ...current, ...patch })
}

export { DEFAULT_SETTINGS, SETTINGS_KEY }

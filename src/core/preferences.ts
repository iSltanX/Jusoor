/**
 * اشتقاق اللغة والاتجاه والسمة الفعلية من التفضيلات ومن بيئة التشغيل.
 *
 * كل ما هنا دوال خالصة: تستقبل حالة البيئة كوسيط ولا تقرأها بنفسها.
 * هذا ما يجعل هذه القرارات قابلة للاختبار دون تشغيل متصفح.
 */

import {
  FALLBACK_LANGUAGE,
  LANGUAGES,
  type Direction,
  type Language,
  type LanguagePreference,
  type Theme,
  type ThemePreference,
} from './settings'

function isSupportedLanguage(value: string): value is Language {
  return (LANGUAGES as readonly string[]).includes(value)
}

/**
 * يستخرج لغة مدعومة من وسم لغة مثل `ar`, `ar-SA`, `en-US`.
 * يعيد `undefined` إذا لم تكن اللغة الأساسية مدعومة.
 */
function matchLanguageTag(tag: string): Language | undefined {
  const primary = tag.trim().toLowerCase().split('-')[0]
  if (primary === undefined) return undefined
  return isSupportedLanguage(primary) ? primary : undefined
}

/**
 * يحسم لغة الواجهة الفعلية.
 *
 * `ar` أو `en` تُطبَّق كما هي. و`auto` تتبع أول لغة متصفح مدعومة،
 * وإلا فالإنجليزية لغةً احتياطية — دستور المنتج §12.
 */
export function resolveLanguage(
  preference: LanguagePreference,
  browserLanguages: readonly string[] = [],
): Language {
  if (preference !== 'auto') return preference

  for (const tag of browserLanguages) {
    const matched = matchLanguageTag(tag)
    if (matched !== undefined) return matched
  }

  return FALLBACK_LANGUAGE
}

/**
 * اتجاه الواجهة مشتق من اللغة وحدها.
 * العربية RTL والإنجليزية LTR ضمن واجهة واحدة متكيفة — دستور المنتج §12.
 */
export function directionForLanguage(language: Language): Direction {
  return language === 'ar' ? 'rtl' : 'ltr'
}

/**
 * يحسم السمة الفعلية.
 * `system` تتبع تفضيل نظام التشغيل الممرَّر إليها.
 */
export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): Theme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light'
  return preference
}

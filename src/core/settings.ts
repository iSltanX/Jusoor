/**
 * أنواع الإعدادات وقيمها الافتراضية وتطبيعها.
 *
 * طبقة core خالصة: لا chrome.* ولا IndexedDB ولا React ولا DOM ولا نصوص واجهة.
 */

/** لغات الواجهة المدعومة. المحتوى الذي يكتبه المستخدم لا يخضع لهذه القائمة ولا يُترجم. */
export const LANGUAGES = ['ar', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

/**
 * تفضيل اللغة كما يخزنه المستخدم.
 * `auto` تعني «حسب لغة المتصفح»، وهي الافتراضي وفق دستور المنتج §12.
 */
const LANGUAGE_PREFERENCES = ['ar', 'en', 'auto'] as const
export type LanguagePreference = (typeof LANGUAGE_PREFERENCES)[number]

/** اللغة الاحتياطية عندما تكون لغة المتصفح غير مدعومة — دستور المنتج §12. */
export const FALLBACK_LANGUAGE: Language = 'en'

/** اتجاه الواجهة. مشتق من اللغة، ولا يُخزَّن ولا يُختار يدويًا. */
export type Direction = 'rtl' | 'ltr'

/** السمة الفعلية المطبقة على الجذر. */
export type Theme = 'light' | 'dark'

/** تفضيل السمة كما يخزنه المستخدم. `system` تتبع إعداد نظام التشغيل. */
const THEME_PREFERENCES = ['light', 'dark', 'system'] as const
export type ThemePreference = (typeof THEME_PREFERENCES)[number]

/**
 * الإعدادات المحفوظة. تبقى صغيرة عمدًا — بيانات المنتج ليست من شأنها.
 *
 * `lastWorkspaceId` مؤشر لا بيانات: يسرّع «إضافة الصفحة الحالية» بتذكّر آخر
 * مساحة عمل عليها المستخدم (دستور المنتج §9.1)، ويبقى قابلًا للتغيير دائمًا.
 * المساحة نفسها تعيش في IndexedDB؛ هذا سطر واحد يشير إليها لا نسخة منها.
 */
export interface Settings {
  language: LanguagePreference
  theme: ThemePreference
  lastWorkspaceId?: string
  /**
   * هل رأى المستخدم شاشة أول تشغيل؟ علامة عرض لا بيانات منتج: أسوأ ما يقع عند
   * فقدها إعادة عرض شاشة تعريفية، لا فقدان شيء أدخله المستخدم.
   */
  firstRunSeen: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'auto',
  theme: 'system',
  firstRunSeen: false,
}

function isLanguagePreference(value: unknown): value is LanguagePreference {
  return (
    typeof value === 'string' &&
    (LANGUAGE_PREFERENCES as readonly string[]).includes(value)
  )
}

function isThemePreference(value: unknown): value is ThemePreference {
  return (
    typeof value === 'string' &&
    (THEME_PREFERENCES as readonly string[]).includes(value)
  )
}

/**
 * يحوّل قيمة مخزنة مجهولة إلى إعدادات صالحة.
 *
 * القيم غير المعروفة تسقط إلى الافتراضي بدل رفض الكائن كله، حتى لا يفقد المستخدم
 * إعدادًا سليمًا بسبب إعداد آخر تالف.
 */
export function normalizeSettings(value: unknown): Settings {
  if (typeof value !== 'object' || value === null) return { ...DEFAULT_SETTINGS }

  const raw = value as Record<string, unknown>

  // مؤشر لا يُوثق به: سلسلة غير فارغة أو غياب. مساحة محذوفة لاحقًا تجعله يشير
  // إلى لا شيء، فمن يقرؤه يتعامل مع «غير موجودة» لا مع ضمان وجود.
  const lastWorkspaceId =
    typeof raw.lastWorkspaceId === 'string' && raw.lastWorkspaceId.trim() !== ''
      ? raw.lastWorkspaceId
      : undefined

  return {
    language: isLanguagePreference(raw.language)
      ? raw.language
      : DEFAULT_SETTINGS.language,
    theme: isThemePreference(raw.theme) ? raw.theme : DEFAULT_SETTINGS.theme,
    // أي قيمة غير منطقية تُقرأ «لم يرَ بعد»: إعادة عرض التعريف أهون من إخفائه خطأً.
    firstRunSeen: raw.firstRunSeen === true,
    ...(lastWorkspaceId !== undefined ? { lastWorkspaceId } : {}),
  }
}

/**
 * تصنيف رابط صفحة حسب مخططه — لتمييز ثلاث قدرات مختلفة تمامًا لا تُخلط: قابل
 * للحفظ كرابط، قابل للوصول إلى محتواه، قابل لاستعادة موضع داخله. هذا التصنيف
 * يخص الأولى فقط، ولا يرفض أي مخطط — دستور المنتج §13.2 يسمح بحفظ الرابط
 * والعنوان حتى مع تعذر الوصول إلى المحتوى، وهذه المرحلة لا تستخدم content
 * scripts أصلًا فلا فرق عملي بينها من ناحية القدرة على الحفظ.
 *
 * دالة خالصة بلا استثناء لبنية غير متوقعة — تحليل بادئة النص فقط، لا new URL()،
 * فلا تفشل على مخططات غير قياسية.
 */
export type PageLinkKind = 'http' | 'browser-internal' | 'extension-page' | 'other-scheme'

/** مخططات صفحات المتصفح الداخلية — قائمة صغيرة موثقة، لا تُوسَّع باجتهاد. */
const BROWSER_INTERNAL_SCHEMES: ReadonlySet<string> = new Set([
  'chrome',
  'edge',
  'about',
  'devtools',
  'chrome-search',
  'chrome-untrusted',
  'view-source',
])

export function classifyPageUrl(url: string): PageLinkKind {
  const colonIndex = url.indexOf(':')
  const scheme = colonIndex === -1 ? '' : url.slice(0, colonIndex).toLowerCase()

  if (scheme === 'http' || scheme === 'https') return 'http'
  if (scheme === 'chrome-extension') return 'extension-page'
  if (BROWSER_INTERNAL_SCHEMES.has(scheme)) return 'browser-internal'
  return 'other-scheme'
}

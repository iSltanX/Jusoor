/**
 * قراءة حالة بيئة التشغيل التي تحتاجها طبقة app لاشتقاق التفضيلات.
 *
 * تُقرأ هنا ثم تُمرَّر إلى دوال core الخالصة، فيبقى المنطق قابلًا للاختبار
 * دون متصفح ودون DOM.
 */

/**
 * لغات المستخدم المفضلة بترتيب الأولوية.
 *
 * تُقرأ من `navigator.languages` لا من `chrome.i18n`، لأن لغة الواجهة في جُسور
 * تتغير وقت التشغيل، بينما `chrome.i18n` تُحدَّد عند تحميل الإضافة ولا تتبدل.
 * يبقى استخدام `chrome.i18n` محصورًا في بيانات المتجر إن لزمت لاحقًا.
 */
export function getPreferredLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return []
  return navigator.languages ?? []
}

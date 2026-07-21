/**
 * البحث النصي داخل بيانات المستخدم — دستور المنتج §9.4.
 *
 * كل ما هنا دوال خالصة: نص إلى نص، وقيمة إلى منطقي. لا تخزين، ولا فهرس مبني،
 * ولا نص مطبَّع محفوظ في أي سجل — التطبيع يُحسب وقت الاستعلام مباشرة من الحقول
 * الأصلية، تمامًا كما تفعل `findPagesByNormalizedUrl` مع الروابط (قرار 0010).
 * فلا حقل مشتق يحتاج ترحيلًا إن تغيّرت قواعد التطبيع لاحقًا.
 *
 * **حدود التطبيع العربي مقفلة بقرار [0008](../../docs/decisions/0008-deferrals.md):**
 * التشكيل، و«أ/إ/آ»، و«ي/ى» — لا شيء غيرها. توسيعها (ة/ه مثلًا، أو التطويل، أو
 * ألف الوصل) يغيّر معنى المطابقة ويحتاج قرارًا جديدًا، لا اجتهادًا هنا. انظر
 * docs/decisions/0014-search-and-organization.md.
 *
 * البحث **قراءة خالصة**: لا يكتب شيئًا، ولا يرفع `lastWorkedAt` (قرار 0009 ينص
 * صراحةً أن مجرد القراءة لا يرفعه)، ولا يعدّل أي قيمة أدخلها المستخدم.
 */

import type { SavedPage } from './page'
import type { Workspace } from './workspace'

/**
 * علامات التشكيل العربية — النطاق U+064B–U+0652 حصرًا:
 * تنوين الفتح والضم والكسر، والفتحة والضمة والكسرة، والشدة والسكون.
 *
 * ما بعد هذا النطاق (الهمزة العلوية والسفلية المنفصلتان، والمدة، وألف خنجرية)
 * علامات تغيّر بنية الحرف لا حركاتٍ عليه، فلا يشملها نص «التشكيل» في قرار 0008.
 */
const ARABIC_DIACRITICS = /[ً-ْ]/g

/** «أ/إ/آ» تُوحَّد إلى ألف مجردة — منصوص عليها في 0008. */
const ALEF_VARIANTS = /[أإآ]/g

/** «ى» تُوحَّد إلى «ي» — منصوص عليها في 0008. الاتجاه واحد ثابت لا يهم أيّه ما دام موحَّدًا. */
const ALEF_MAKSURA = /ى/g

/**
 * يطبّع نصًا للمقارنة وحدها. لا يُعرض ناتجه، ولا يُحفظ، ولا يحل محل أي قيمة
 * أدخلها المستخدم — تمامًا كالتزام `normalizeUrlForComparison` في core/url.ts.
 *
 * ثلاث خطوات، كل واحدة لها مبرر منفصل:
 *
 * 1. **NFC**: تكافؤ Unicode القانوني لا تطبيع لغوي. «أ» تُكتب حرفًا واحدًا
 *    (U+0623) أو حرفين (U+0627 + U+0654)، والشكلان نصٌّ واحد بنص Unicode نفسه.
 *    بدون هذه الخطوة يفشل تطابق نصين متطابقين فعلًا — وهذا خلل لا سياسة لغوية.
 * 2. **خفض حالة الأحرف**: يخص اللاتينية، وهو سلوك بحث قياسي لا تطبيع عربي؛
 *    دستور المنتج §9.4 يوجب أن يعمل البحث بالإنجليزية أيضًا، و«Privacy» لا
 *    تطابق «privacy» بدونه. لا صلة له بقائمة 0008.
 * 3. **التطبيع العربي المعتمد**: التشكيل، ثم «أ/إ/آ»، ثم «ي/ى». ولا شيء بعدها.
 */
export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFC')
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, '')
    .replace(ALEF_VARIANTS, 'ا')
    .replace(ALEF_MAKSURA, 'ي')
}

/**
 * يحوّل ما كتبه المستخدم إلى كلمات بحث مطبَّعة.
 *
 * استعلام فارغ أو فراغ كامل يعطي قائمة فارغة، ومعناها المتفق عليه في كل دوال
 * هذا الملف: **لا تصفية إطلاقًا** — لا «لا نتائج». المستخدم لم يبحث بعد.
 */
export function toSearchTerms(query: string): string[] {
  const normalized = normalizeForSearch(query).trim()
  if (normalized === '') return []
  return normalized.split(/\s+/)
}

/**
 * تطابق كل الكلمات (AND) بالاحتواء، بلا ترتيب أهمية ولا تقريب.
 *
 * «كل الكلمات» لا «أيّها»: البحث بكلمتين يقصد تضييق النتيجة لا توسيعها. ولا
 * ترتيب بدرجة مطابقة — الترتيب المعروض يبقى ما اختاره المستخدم صراحةً، فلا
 * تعيد الشاشة ترتيب نفسها من تحته بمعيار خفيّ.
 */
function matchesTerms(haystack: string, terms: readonly string[]): boolean {
  if (terms.length === 0) return true
  const normalized = normalizeForSearch(haystack)
  return terms.every((term) => normalized.includes(term))
}

/** يضم الحقول النصية الموجودة فعلًا. الغائب لا يصبح سلسلة فارغة تُشوّش المطابقة. */
function joinFields(fields: readonly (string | undefined)[]): string {
  return fields.filter((field): field is string => field !== undefined).join('\n')
}

/**
 * النص القابل للبحث داخل صفحة — دستور المنتج §9.4: العنوان، والرابط، وسبب
 * الفتح، والوسوم التي أضافها المستخدم، ونصوص ملاحظاتها.
 *
 * حالة التقدم والدور **ليستا هنا**: قيمتاهما رمزان إنجليزيان ثابتان
 * (`not-started`، `primary`) لا نصٌّ يقرؤه المستخدم، والبحث عنهما بلغة الواجهة
 * كان سيتطلب حقن نصوص مترجَمة في `core` — وهو ما يمنعه قرار 0005. البعدان
 * يُغطَّيان بالتصفية الصريحة في page-organization.ts، وهي أدق من مطابقة نصية.
 *
 * التظليلات مذكورة في §9.4 وغير موجودة في هذه النسخة (مؤجلة بنص §14)، فلا نصّ
 * لها يُبحث فيه بعد.
 */
export function pageSearchText(page: SavedPage): string {
  return joinFields([
    page.title,
    page.url,
    page.reason,
    page.labels?.join(' '),
    ...page.notes.map((note) => note.body),
  ])
}

/**
 * النص القابل للبحث داخل مساحة — ما يميّز مهمة عن أخرى في الشاشة الرئيسية
 * (§10.1): الاسم والهدف والوصف والملاحظة العامة ونقطة التوقف والخطوة التالية.
 *
 * لا يشمل عناوين صفحاتها: ذلك يتطلب تحميل صفحات كل المساحات لمجرد الكتابة في
 * حقل بحث. البحث داخل الصفحات موضعه المساحة نفسها (§9.4).
 */
export function workspaceSearchText(workspace: Workspace): string {
  return joinFields([
    workspace.name,
    workspace.goal,
    workspace.description,
    workspace.generalNote,
    workspace.lastReached,
    workspace.nextStep,
  ])
}

/** هل تطابق الصفحة كل كلمات البحث؟ قائمة كلمات فارغة تطابق كل شيء. */
export function matchesPage(page: SavedPage, terms: readonly string[]): boolean {
  return matchesTerms(pageSearchText(page), terms)
}

/** هل تطابق المساحة كل كلمات البحث؟ قائمة كلمات فارغة تطابق كل شيء. */
export function matchesWorkspace(workspace: Workspace, terms: readonly string[]): boolean {
  return matchesTerms(workspaceSearchText(workspace), terms)
}

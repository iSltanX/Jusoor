/**
 * تطبيع الرابط **للمقارنة واكتشاف التكرار فقط** — دستور المنتج §9.5.
 * لا استخدام آخر لهذه الدالة في أي طبقة: لا تُعرض قيمتها، ولا تُفتح، ولا تحل
 * محل الرابط الأصلي في أي مكان.
 *
 * أربعة ثوابت معمارية بشأنها، لا تتغير عبر المراحل:
 *
 * 1. **الغرض مقصور على المقارنة.** الاسم نفسه (`ForComparison`) التزام: أي
 *    استهلاك آخر لناتجها — عرضًا أو فتحًا أو حفظًا بديلًا عن الأصل — خطأ استخدام.
 * 2. **`SavedPage.url` لا يُستبدل أبدًا.** الرابط الأصلي حرفيًا كما التُقط هو ما
 *    يُخزَّن ويُفتح لاحقًا؛ ناتج هذه الدالة قيمة منفصلة عابرة، لا تُكتب مكانه.
 * 3. **التطابق ليس دمجًا ولا منعًا ولا حذفًا تلقائيًا.** بحكم توقيع الدالة
 *    `(url: string) => string` هي مجرد تحويل نص إلى نص — لا اتصال لها بالتخزين،
 *    فلا يمكنها بنيويًا حذف سجل أو دمج صفحتين. طبقة التخزين (findPagesByNormalizedUrl
 *    في src/storage/pages.ts) تستخدمها لإرجاع **مرشحين محتملين فقط**.
 * 4. **القرار يبقى للمستخدم دائمًا.** فتح النسخة الموجودة، أو إضافة نسخة أخرى،
 *    أو تحديث بيانات الموجودة، أو تجاهل التنبيه بالكامل — كلها خيارات صريحة
 *    يختارها المستخدم عند اكتشاف تطابق؛ لا هذه الدالة ولا طبقة التخزين تقرر
 *    نيابةً عنه — دستور المنتج §9.5.
 *
 * لا يوجد `urlKey` ولا أي حقل مشتق من هذه الدالة في نموذج المجال (src/core/)
 * ولا حتى في طبقة التخزين حاليًا: findPagesByNormalizedUrl تعيد حساب الناتج من
 * `url` الأصلي وقت الاستعلام مباشرة، فلا حقل مقارنة مخزَّن يحتاج مزامنة —
 * انظر docs/decisions/0009-data-model.md وتقرير تسليم مرحلة التخزين.
 *
 * تطبيع محافظ عمدًا: اكتشاف التكرار تنبيه لا حذف تلقائي (§9.5)، فأسوأ أثر لتطبيع
 * مفرط هو دمج خاطئ بين صفحتين مختلفتين فعليًا، بينما أسوأ أثر لتطبيع ناقص هو
 * تفويت تنبيه واحد. لذلك: www. يُحفظ، وhttp لا يُوحَّد مع https، ومعاملات
 * الاستعلام تُحفظ إلا قائمة تتبع صغيرة ثابتة.
 */

/** معاملات تتبع معتمدة تُزال من المقارنة فقط — قائمة صغيرة ثابتة، لا تُوسَّع باجتهاد. */
const TRACKING_PARAMETERS: ReadonlySet<string> = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'msclkid',
  'mc_eid',
  'igshid',
  'yclid',
])

/** يميّز fragment مسار SPA (#/route أو #!/route) عن fragment عادي يُزال للمقارنة. */
function isSpaRouteFragment(hash: string): boolean {
  return hash.startsWith('#/') || hash.startsWith('#!/')
}

/** يزيل شرطة أخيرة واحدة من المسار، مع الحفاظ على الجذر '/'. */
function removeSingleTrailingSlash(pathname: string): string {
  if (pathname.length <= 1) return pathname
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

export function normalizeUrlForComparison(url: string): string {
  const colonIndex = url.indexOf(':')
  const rawScheme = colonIndex === -1 ? '' : url.slice(0, colonIndex).toLowerCase()

  /*
   * مخططات غير http(s): تصغير المخطط فقط، والباقي حرفي — دستور المنتج §13.2.
   * يُعالَج النص خامًا بلا new URL()، لأن المحلّل القياسي يستخرج مضيفًا ومسارًا
   * من مخططات غير قياسية (chrome:، مثلًا) بطريقة قد تُسقط الحالة الأصلية للباقي.
   */
  if (rawScheme !== 'http' && rawScheme !== 'https') {
    return colonIndex === -1 ? url : rawScheme + url.slice(colonIndex)
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    // رابط غير قابل للتحليل — يُعاد كما هو؛ صحة الرابط مسؤولية isValidPageUrl عند الإدخال.
    return url
  }

  // المخطط واسم المضيف مُصغَّران أصلًا عبر محلّل URL القياسي. www. لا يُزال — يُحفظ حرفيًا.
  // المنفذ الافتراضي (80/443) يُسقطه المحلّل تلقائيًا؛ منفذ صريح غير افتراضي يبقى.
  const pathname = removeSingleTrailingSlash(parsed.pathname)

  const params = new URLSearchParams(parsed.search)
  for (const key of [...params.keys()]) {
    if (TRACKING_PARAMETERS.has(key)) params.delete(key)
  }
  params.sort()
  const search = params.size === 0 ? '' : `?${params.toString()}`

  const fragment = isSpaRouteFragment(parsed.hash) ? parsed.hash : ''

  return `${parsed.protocol}//${parsed.host}${pathname}${search}${fragment}`
}

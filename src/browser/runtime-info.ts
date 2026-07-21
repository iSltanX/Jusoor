/**
 * قراءة معلومات الإضافة من بيان التشغيل الفعلي.
 *
 * `chrome.runtime.getManifest()` هي مصدر رقم الإصدار الوحيد وقت التشغيل:
 * القيمة التي يراها المستخدم هي حرفيًا ما شُحن في manifest.json المبني، فلا
 * توجد نسخة ثانية مكتوبة يدويًا يمكن أن تتباعد عنها.
 */

/**
 * يعيد رقم إصدار الإضافة من الـmanifest، أو undefined عند غياب الواجهة.
 *
 * الغياب متوقع خارج سياق الإضافة (بيئة الاختبار، معاينة تطويرية)، ولا يجوز
 * أن يعطّل الشاشة التي تعرضه — تُخفي الواجهة السطر بدل عرض قيمة مختلقة.
 */
export function readExtensionVersion(): string | undefined {
  try {
    if (typeof chrome === 'undefined' || chrome.runtime?.getManifest === undefined) {
      return undefined
    }
    return chrome.runtime.getManifest().version
  } catch {
    return undefined
  }
}

export type UpdateCheckResult =
  | { status: 'no_update' }
  | { status: 'update_available'; version: string | undefined }
  | { status: 'throttled' }
  | { status: 'unavailable' }

/**
 * يطلب من المتصفح نفسه فحص تحديث فوري — `chrome.runtime.requestUpdateCheck`
 * هي الآلية الحقيقية الوحيدة؛ لا تمر عبر شبكة جُسور (`connect-src 'none'` لا
 * يمس هذا الاستدعاء المتصفحي المباز) ولا تثبّت شيئًا بنفسها: النتيجة تُعرض
 * فقط، والتثبيت الفعلي من المتصفح تلقائيًا كما هو الحال دومًا.
 */
export function requestUpdateCheck(): Promise<UpdateCheckResult> {
  try {
    if (typeof chrome === 'undefined' || chrome.runtime?.requestUpdateCheck === undefined) {
      return Promise.resolve({ status: 'unavailable' })
    }
    return chrome.runtime
      .requestUpdateCheck()
      .then((result): UpdateCheckResult => {
        if (result.status === 'update_available') {
          return { status: 'update_available', version: result.version }
        }
        if (result.status === 'throttled') return { status: 'throttled' }
        return { status: 'no_update' }
      })
      .catch((): UpdateCheckResult => ({ status: 'unavailable' }))
  } catch {
    return Promise.resolve({ status: 'unavailable' })
  }
}

/**
 * أنواع النتائج والأخطاء لطبقة حالات الاستخدام.
 *
 * ApplicationErrorCode لا يخترع رموزًا موازية لأخطاء core/ أو storage/؛ كل
 * متغيّر إما يستشهد برمز مصدره الحقيقي (DomainErrorCode أو StorageErrorCode)
 * وإما يعبّر عن مفهوم جديد فعلًا لا يوجد في أي من الطبقتين (سجل غير موجود من
 * منظور حالة استخدام، أو مدخل غير صالح لم تتحقق منه core/ بعد). لا خلط بين
 * الطبقات الثلاث؛ كل خطأ يحمل مصدره معه صراحة — "حافظ على السبب الأصلي".
 */

import type { DomainErrorCode } from '../core/errors'
import type { UnavailableTabReason } from '../core/browser-tab'
import type { ReadResult, StorageErrorCode } from '../storage/errors'

/** الكيانات التي قد يبحث عنها استخدام ولا يجدها. */
export type EntityKind = 'workspace' | 'saved-page' | 'page-note'

/** فشل التقاط من طبقة المتصفح — مفهوم جديد فعلًا، لا موازٍ لخطأ مجال أو تخزين. */
export type BrowserCaptureReason = 'no-suitable-tab' | 'unavailable' | 'api-error'

export type ApplicationErrorCode =
  | { kind: 'not-found'; entity: EntityKind }
  | { kind: 'invalid-input'; field: string }
  | { kind: 'domain'; code: DomainErrorCode }
  | { kind: 'storage'; code: StorageErrorCode; details?: string }
  /**
   * `detail` يميّز غياب الرابط عن غياب العنوان بدل اختزالهما في «غير متاح» —
   * الفرق يغيّر ما تقوله الواجهة للمستخدم وما تعرضه عليه من مخرج.
   */
  | {
      kind: 'browser-capture'
      reason: BrowserCaptureReason
      detail?: UnavailableTabReason
      message?: string
    }
  /**
   * عطل تشغيلي حقيقي لا نتيجة تحقق متوقعة — تعذر فتح IndexedDB أو إجهاض معاملة.
   * `storage/errors.ts` يترك هذه الحالة استثناءً مرفوضًا عبر الوعد عمدًا، فلا رمز
   * StorageErrorCode يصفها؛ تُلتقط عند حدود التركيب وتُحوَّل هنا بدل أن تنتشر خامًا.
   */
  | { kind: 'unexpected'; message?: string }

export type UseCaseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ApplicationErrorCode }

/** يحوّل فشل تخزين (كتابة أو تحليل) إلى خطأ تطبيق، محتفظًا برمز السبب الأصلي. */
export function fromStorageFailure(failure: {
  error: StorageErrorCode
  details?: string
}): ApplicationErrorCode {
  return {
    kind: 'storage',
    code: failure.error,
    ...(failure.details !== undefined ? { details: failure.details } : {}),
  }
}

/**
 * يحوّل نتيجة قراءة مفردة (ReadResult) إلى نتيجة حالة استخدام موحَّدة —
 * تُميّز الغياب عن التلف عن النجاح تمامًا كما تُميّزها طبقة التخزين، دون فقدان
 * أي من الفروق الثلاثة أثناء التحويل.
 */
export function fromReadResult<T>(
  result: ReadResult<T>,
  entity: EntityKind,
): UseCaseResult<T> {
  if (result.status === 'found') return { ok: true, value: result.value }
  if (result.status === 'not-found') return { ok: false, error: { kind: 'not-found', entity } }
  return { ok: false, error: fromStorageFailure(result) }
}

/**
 * أخطاء طبقة التخزين — منفصلة تمامًا عن DomainErrorCode في core/errors.ts.
 *
 * أخطاء البنية التحتية (سجل تالف، رفض كتابة يخالف قواعد المجال) تخص storage/
 * وحدها ولا تُخلط بأخطاء انتقالات المجال؛ فشل IndexedDB الحقيقي (معاملة مُجهضة
 * أو طلب رفضه المتصفح) يبقى استثناءً مرفوضًا عبر الوعد — انظر idb.ts — لا قيمة
 * StorageResult، لأنه عطل تشغيلي حقيقي لا نتيجة تحقق متوقعة.
 */

export type StorageErrorCode = 'storage/corrupt-record' | 'storage/invalid-write'

/** نتيجة كتابة أو تحقق تنتهي بنجاح أو برفض محكوم — لا استثناء لفشل التحقق. */
export type StorageResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: StorageErrorCode; details?: string }

/**
 * نتيجة قراءة سجل واحد بمعرفه — تميّز بين ثلاث حالات مختلفة تمامًا: وُجد
 * وصالح، غير موجود إطلاقًا، أو موجود لكنه تالف. سجل تالف لا يُسمح له بالمرور
 * صامتًا بوصفه صالحًا، ولا بوصفه غائبًا؛ له حالته المستقلة الثالثة.
 */
export type ReadResult<T> =
  | { status: 'found'; value: T }
  | { status: 'not-found' }
  | { status: 'corrupt'; error: StorageErrorCode; details?: string }

/**
 * الحد الأدنى للتشخيص عند سجل تالف ضمن قائمة — لا محتوى المستخدم الحساس.
 * `key` قد يغيب إن كان معرّف السجل نفسه (id) هو الحقل التالف فيتعذر تحديده.
 */
export interface CorruptRecordInfo {
  store: string
  key?: string
  error: StorageErrorCode
  details?: string
}

/**
 * عقد عمليات السرد: سجلات صالحة، وسجلات تالفة منفصلة بوضوح — لا اختفاء صامت.
 *
 * القراءة المفردة (ReadResult) تفشل العملية كلها عند التلف لأن المستدعي طلب
 * سجلًا بعينه؛ أما السرد فقد يحوي عشرات السجلات، فرفض العملية كاملة بسبب سجل
 * واحد فاسد يُخفي سجلات صحيحة أخرى بلا داعٍ. لذلك: السجلات الصالحة تُعاد في
 * `items`، والتالفة تُعاد في `corrupted` — لا تختفي، ولا تُعامَل كصالحة.
 */
export interface ListResult<T> {
  items: T[]
  corrupted: CorruptRecordInfo[]
}

/** يستخرج معرّف السجل التالف قدر الإمكان للتشخيص، دون افتراض بنية غير موثوقة. */
export function bestEffortRecordKey(raw: unknown): string | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const id = (raw as Record<string, unknown>).id
  return typeof id === 'string' ? id : undefined
}

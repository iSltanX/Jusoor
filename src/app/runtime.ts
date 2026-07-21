/**
 * التطبيقات الحقيقية للعقود المحقونة، ومقبض قاعدة البيانات المشترك.
 *
 * حالات الاستخدام تبقى تستقبل `Clock` و`IdGenerator` وسيطين صريحين ولا تستدعي
 * `Date.now()` ولا `crypto.randomUUID()` بنفسها؛ هذا الملف هو الموضع **الوحيد**
 * الذي تُستدعى فيه فعليًا، فيُحقن منه عند التركيب وتبقى الاختبارات على قيم ثابتة.
 *
 * ولا شيء هنا يلمس DOM ولا React ولا `chrome.*`: `Date.now` و`crypto.randomUUID`
 * و`indexedDB` واجهات منصة قياسية متاحة في عامل الخدمة وصفحات الإضافة معًا.
 */

import type { Clock } from './clock'
import type { IdGenerator } from './ids'
import type { ApplicationErrorCode, UseCaseResult } from './errors'
import { asPageNoteId, asSavedPageId, asWorkspaceId } from '../core/ids'
import { openDatabase } from '../storage/database'

export const systemClock: Clock = {
  now: () => Date.now(),
}

export const randomIdGenerator: IdGenerator = {
  workspaceId: () => asWorkspaceId(crypto.randomUUID()),
  savedPageId: () => asSavedPageId(crypto.randomUUID()),
  pageNoteId: () => asPageNoteId(crypto.randomUUID()),
}

let databaseHandle: Promise<IDBDatabase> | undefined

/**
 * يفتح القاعدة مرة واحدة ويعيد المقبض نفسه بعدها.
 *
 * الفشل **لا يُخزَّن**: تخزين وعد مرفوض كان سيجعل كل محاولة لاحقة تفشل بالفشل
 * الأول نفسه، فتستحيل إعادة المحاولة التي يعتمد عليها مسار الخطأ في الواجهة.
 */
export function getDatabase(): Promise<IDBDatabase> {
  databaseHandle ??= openDatabase().catch((error: unknown) => {
    databaseHandle = undefined
    throw error
  })

  return databaseHandle
}

/** يحوّل عطلًا تشغيليًا خامًا إلى خطأ تطبيق منظم — لا استثناء يصل طبقة العرض. */
export function toUnexpected(error: unknown): ApplicationErrorCode {
  return {
    kind: 'unexpected',
    ...(error instanceof Error ? { message: error.message } : {}),
  }
}

/**
 * يشغّل عملية تلمس القاعدة، محوّلًا أي عطل تشغيلي إلى نتيجة منظمة.
 *
 * كانت منسوخة حرفيًا في ملفات التركيب الثلاثة (الإنشاء، والجلسة، والنقل)؛
 * موضعها الواحد هنا مع مقبض القاعدة الذي تلتف حوله.
 */
export async function withDatabase<T>(
  operation: (db: IDBDatabase) => Promise<UseCaseResult<T>>,
): Promise<UseCaseResult<T>> {
  try {
    return await operation(await getDatabase())
  } catch (error: unknown) {
    return { ok: false, error: toUnexpected(error) }
  }
}

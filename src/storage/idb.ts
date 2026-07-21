/**
 * أغلفة صغيرة تحوّل طلبات ومعاملات IndexedDB القائمة على الأحداث إلى وعود،
 * مع تغطية صريحة لـ onerror وonabort — لا الاكتفاء بـ onsuccess وحده.
 *
 * نجاح طلب واحد داخل معاملة لا يعني نجاح المعاملة كلها: الطلب قد ينجح ثم
 * تُجهض المعاملة لاحقًا (خطأ في طلب آخر ضمنها، رفض من المتصفح، إلخ). لذلك
 * تُستخدم transactionDone دائمًا لتأكيد اكتمال أي معاملة كتابة قبل اعتبارها
 * ناجحة، لا الاكتفاء بنجاح طلب put/get المفرد.
 */

/** يحوّل طلب IndexedDB مفردًا إلى وعد، مع رفض صريح يحمل خطأ IndexedDB الأصلي. */
export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('طلب IndexedDB فشل بلا تفاصيل.'))
  })
}

/** ينتظر اكتمال معاملة كاملة، ويرفض عند الخطأ أو الإجهاض. */
export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('معاملة IndexedDB فشلت بلا تفاصيل.'))
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('أُجهضت معاملة IndexedDB.'))
  })
}

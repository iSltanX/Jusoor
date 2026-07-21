/**
 * أخطاء المجال — رموز مستقرة، لا نصوص واجهة.
 *
 * كل رمز مستقر عبر الزمن وقابل للاختبار مباشرة؛ ترجمته إلى نص تعرضه الواجهة
 * مسؤولية app/ui لاحقًا عبر src/i18n، لا core/.
 */

export type DomainErrorCode = 'workspace/invalid-status-transition'

/** نتيجة عملية مجال قد تُرفض. لا استثناءات هنا — القيمة نفسها تحمل النجاح أو الرفض. */
export type Result<T> = { ok: true; value: T } | { ok: false; error: DomainErrorCode }

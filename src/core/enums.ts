/**
 * القيم الداخلية المستقرة (Enums) لنموذج المجال.
 *
 * كل قيمة رمز إنجليزي ثابت لا يتغير بتغيّر لغة الواجهة؛ ترجمتها تعيش في
 * src/i18n/messages.ts بمفاتيح مطبَّعة. لا يُخزَّن نص عربي ولا إنجليزي هنا —
 * انظر docs/decisions/0009-data-model.md
 */

// ===== قالب المساحة — دستور المنتج §7.1 =====

export const WORKSPACE_TEMPLATES = ['general', 'research', 'development'] as const
export type WorkspaceTemplate = (typeof WORKSPACE_TEMPLATES)[number]

/** يُخزَّن من النسخة الأولى؛ لا يُجبر المستخدم على اختياره أثناء الإنشاء. */
export const DEFAULT_WORKSPACE_TEMPLATE: WorkspaceTemplate = 'general'

export function isWorkspaceTemplate(value: unknown): value is WorkspaceTemplate {
  return (
    typeof value === 'string' &&
    (WORKSPACE_TEMPLATES as readonly string[]).includes(value)
  )
}

// ===== حالة المساحة — دستور المنتج §7.1 =====

export const WORKSPACE_STATUSES = ['active', 'frozen', 'archived'] as const
export type WorkspaceStatus = (typeof WORKSPACE_STATUSES)[number]
export const DEFAULT_WORKSPACE_STATUS: WorkspaceStatus = 'active'

export function isWorkspaceStatus(value: unknown): value is WorkspaceStatus {
  return (
    typeof value === 'string' && (WORKSPACE_STATUSES as readonly string[]).includes(value)
  )
}

// ===== حالة تقدم الصفحة — دستور المنتج §7.3 · دستور الهوية §10.3 =====
// حاضرة دائمًا: «لم تبدأ» حقيقة واقعية عن صفحة أُضيفت للتو، لا حكمًا نيابة عن المستخدم.
// قارن بـ PageRole أدناه الذي لا يحمل افتراضًا لهذا السبب بالضبط.

export const PAGE_PROGRESS_STATUSES = [
  'not-started',
  'in-progress',
  'paused',
  'complete',
] as const
export type PageProgressStatus = (typeof PAGE_PROGRESS_STATUSES)[number]
export const DEFAULT_PAGE_PROGRESS_STATUS: PageProgressStatus = 'not-started'

export function isPageProgressStatus(value: unknown): value is PageProgressStatus {
  return (
    typeof value === 'string' &&
    (PAGE_PROGRESS_STATUSES as readonly string[]).includes(value)
  )
}

// ===== دور الصفحة — دستور المنتج §7.3 · دستور الهوية §10.3 =====
// بلا افتراضي عمدًا: اعتبار الصفحة «أساسية» تلقائيًا حكم، وجُسور لا يقرر لماذا فُتحت
// الصفحة نيابة عن المستخدم — دستور المنتج §16. الغياب يعني «لم يُصنَّف بعد»، وهو الصدق.

export const PAGE_ROLES = ['primary', 'supporting', 'verify', 'excluded'] as const
export type PageRole = (typeof PAGE_ROLES)[number]

export function isPageRole(value: unknown): value is PageRole {
  return typeof value === 'string' && (PAGE_ROLES as readonly string[]).includes(value)
}

// ===== حالة فتح التبويب — حالة جلسة مؤقتة، لا تُخزَّن في النسخة الأولى =====
// مستقلة تمامًا عن RestoreStatus أدناه: فتح التبويب لا يعني نجاح استعادة موضع القراءة.
// «opened» هنا ليست مرادفًا لـ«restored» — تصحيح موثق في docs/decisions/0009-data-model.md

export const TAB_OPENING_STATUSES = [
  'not-attempted',
  'opening',
  'opened',
  'unavailable',
] as const
export type TabOpeningStatus = (typeof TAB_OPENING_STATUSES)[number]
export const DEFAULT_TAB_OPENING_STATUS: TabOpeningStatus = 'not-attempted'

export function isTabOpeningStatus(value: unknown): value is TabOpeningStatus {
  return (
    typeof value === 'string' &&
    (TAB_OPENING_STATUSES as readonly string[]).includes(value)
  )
}

// ===== نظام الاستعادة الصادق — دستور المنتج §13.3 · دستور الهوية §10.4 (ثماني حالات) =====
// معرَّف كاملًا في طبقة المجال منذ الآن، وإن بقيت بعض القيم غير قابلة للوصول فعليًا
// حتى تنفيذ التقاط موضع القراءة لاحقًا (لا content script في هذه المرحلة).

export const RESTORE_STATUSES = [
  'not-opened',
  'restoring',
  'restored',
  'restored-approximately',
  'position-not-found',
  'unavailable',
  'permission-required',
  'login-required',
] as const
export type RestoreStatus = (typeof RESTORE_STATUSES)[number]

export function isRestoreStatus(value: unknown): value is RestoreStatus {
  return (
    typeof value === 'string' && (RESTORE_STATUSES as readonly string[]).includes(value)
  )
}

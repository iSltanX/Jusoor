/**
 * قواعد التحقق الخالصة لمدخلات المجال.
 *
 * كل دالة هنا حتمية وبلا أثر جانبي: تستقبل قيمًا وتعيد نتيجة، ولا تلمس التخزين
 * ولا تعرف IndexedDB. التحقق من وجود سجل مرجعي فعليًا (مثل مساحة أشارت إليها
 * صفحة) مسؤولية app/ لاحقًا، لأنه يتطلب قراءة من التخزين.
 *
 * لا حدود أطوال تحريرية عشوائية — دستور المنتج لا يفرض أي حد؛ التحقق هنا يقتصر
 * على trim وعدم الفراغ حيث يلزم. النص يُحفظ كاملًا؛ القص شأن عرض في الواجهة.
 */

import type { SavedPage } from './page'
import type { Workspace } from './workspace'

/** اسم المساحة صالح إن بقي غير فارغ بعد trim. */
export function isValidWorkspaceName(name: string): boolean {
  return name.trim().length > 0
}

/**
 * ينظف نصًا اختياريًا: يزيل الفراغ الطرفي، ويحوّل الفراغ الكامل إلى غياب.
 * يُستخدم لكل النصوص الاختيارية (goal، description، generalNote، lastReached،
 * nextStep، reason) فلا يُخزَّن فرق شكلي بين "غير موجود" و"سلسلة فارغة".
 */
export function normalizeOptionalText(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

/** رابط الصفحة صالح إن كان قابلًا للتحليل عبر واجهة URL القياسية. بلا قائمة سماح لمخطط بعينه. */
export function isValidPageUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/** الترتيب صالح إن كان عددًا منتهيًا وغير سالب. */
export function isValidOrder(order: number): boolean {
  return Number.isFinite(order) && order >= 0
}

/** التاريخ صالح إن كان عددًا صحيحًا منتهيًا وموجبًا (epoch ms). */
export function isValidTimestamp(value: number): boolean {
  return Number.isInteger(value) && value > 0
}

/** نص الملاحظة صالح إن بقي غير فارغ بعد trim. */
export function isValidNoteBody(body: string): boolean {
  return body.trim().length > 0
}

/** ينظف قائمة وسوم: يزيل الفراغ الطرفي والعناصر الفارغة والتكرار، مع الحفاظ على الترتيب الأول. */
export function normalizeLabels(labels: readonly string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const label of labels) {
    const trimmed = label.trim()
    if (trimmed === '' || seen.has(trimmed)) continue
    seen.add(trimmed)
    result.push(trimmed)
  }

  return result
}

/** createdAt يجب ألا يتجاوز updatedAt. */
export function isDateOrderValid(createdAt: number, updatedAt: number): boolean {
  return createdAt <= updatedAt
}

/**
 * ثبات حالة المساحة مع تواريخها: `frozen` ⟺ frozenAt موجود بلا archivedAt،
 * و`archived` ⟺ archivedAt موجود بلا frozenAt، و`active` ⟺ لا هذا ولا ذاك.
 */
export function isWorkspaceStatusConsistent(
  workspace: Pick<Workspace, 'status' | 'frozenAt' | 'archivedAt'>,
): boolean {
  const hasFrozenAt = workspace.frozenAt !== undefined
  const hasArchivedAt = workspace.archivedAt !== undefined

  if (workspace.status === 'frozen') return hasFrozenAt && !hasArchivedAt
  if (workspace.status === 'archived') return hasArchivedAt && !hasFrozenAt
  return !hasFrozenAt && !hasArchivedAt
}

/**
 * كل صفحة في الدفعة تنتمي فعلًا إلى المساحة المذكورة.
 *
 * صفحة تحمل `workspaceId` مختلفًا تظهر لاحقًا في مساحة أخرى تمامًا — بيانات في
 * سياق لا يخصها، وهو ما يخالف كون الصفحة مملوكة لمساحة واحدة (دستور المنتج §7.2).
 */
export function arePagesWithinWorkspace(
  workspaceId: Workspace['id'],
  pages: readonly Pick<SavedPage, 'workspaceId'>[],
): boolean {
  return pages.every((page) => page.workspaceId === workspaceId)
}

/**
 * لا معرّف صفحة مكرر داخل الدفعة الواحدة.
 *
 * التكرار ليس خطأ شكليًا: الكتابة بـ`put` على المفتاح نفسه تستبدل السجل الأول
 * بالثاني صامتًا، فيختفي أحد اختيارات المستخدم دون أي إشارة.
 */
export function hasUniqueSavedPageIds(pages: readonly Pick<SavedPage, 'id'>[]): boolean {
  return new Set(pages.map((page) => page.id)).size === pages.length
}

/**
 * activePageId، إن وُجد، يجب أن يشير إلى صفحة ضمن صفحات المساحة نفسها.
 * `pages` قائمة صفحات مُمرَّرة صراحةً — لا قراءة تخزين هنا.
 */
export function isActivePageWithinWorkspace(
  workspace: Pick<Workspace, 'id' | 'activePageId'>,
  pages: readonly Pick<SavedPage, 'id' | 'workspaceId'>[],
): boolean {
  if (workspace.activePageId === undefined) return true

  return pages.some(
    (page) => page.id === workspace.activePageId && page.workspaceId === workspace.id,
  )
}

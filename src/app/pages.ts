/**
 * حالات الاستخدام الأساسية للصفحة المحفوظة: إضافة، تحديث، وإعادة ترتيب.
 * تربط قواعد core/ بعقود storage/، دون أي واجهة أو واجهة متصفح.
 */

import type { Clock } from './clock'
import type { IdGenerator } from './ids'
import { fromReadResult, fromStorageFailure, type UseCaseResult } from './errors'
import type { CorruptRecordInfo } from '../storage/errors'
import {
  deleteSavedPage,
  findPagesByNormalizedUrl,
  listPagesByWorkspace,
  readSavedPage,
  writeSavedPage,
  writeSavedPages,
} from '../storage/pages'
import { readWorkspace } from '../storage/workspaces'
import type { SavedPageId, WorkspaceId } from '../core/ids'
import type { SavedPage } from '../core/page'
import type { PageProgressStatus, PageRole } from '../core/enums'
import { DEFAULT_PAGE_PROGRESS_STATUS } from '../core/enums'
import { isValidOrder, isValidPageUrl, normalizeLabels, normalizeOptionalText } from '../core/validation'

// ===== إضافة صفحة إلى مساحة =====

export interface AddPageInput {
  workspaceId: WorkspaceId
  /** العنوان كما التُقط — يُحفظ حرفيًا دون trim، تمامًا مثل url؛ لا محقق طول له في core. */
  title: string
  url: string
  reason?: string
  progressStatus?: PageProgressStatus
  role?: PageRole
  order: number
  /** حاضرة فقط إن اختار المستخدم صراحةً إضافة نسخة أخرى رغم تطابق مكتشف مسبقًا. */
  mode?: 'add-new-copy'
}

export interface AddPageOutcome {
  /** الصفحة المقترحة إن لم تُحفظ بعد (needsUserDecision)، أو المحفوظة فعليًا. */
  page: SavedPage
  saved: boolean
  /** صفحات مطابقة اكتُشفت بمقارنة الرابط المطبَّع — تنبيه لا حذف ولا دمج تلقائي. */
  matches: SavedPage[]
  matchesCorrupted: CorruptRecordInfo[]
  needsUserDecision: boolean
}

/**
 * يضيف صفحة إلى مساحة. عند اكتشاف تطابق رابط سابق ضمن المساحة دون أن يحدد
 * المدخل mode: 'add-new-copy' صراحةً، لا تُحفظ أي نسخة — تُعاد الصفحة المقترحة
 * مع المرشحين المكتشَفين وneedsUserDecision: true، ويترك القرار لاحقًا لمن
 * يستدعي (لا منطق حوار هنا) — دستور المنتج §9.5.
 */
export async function addPage(
  db: IDBDatabase,
  clock: Clock,
  ids: IdGenerator,
  input: AddPageInput,
): Promise<UseCaseResult<AddPageOutcome>> {
  const workspaceResult = fromReadResult(await readWorkspace(db, input.workspaceId), 'workspace')
  if (!workspaceResult.ok) return workspaceResult

  if (!isValidPageUrl(input.url)) {
    return { ok: false, error: { kind: 'invalid-input', field: 'url' } }
  }
  if (!isValidOrder(input.order)) {
    return { ok: false, error: { kind: 'invalid-input', field: 'order' } }
  }

  const reason = normalizeOptionalText(input.reason)
  const now = clock.now()

  const candidate: SavedPage = {
    id: ids.savedPageId(),
    workspaceId: input.workspaceId,
    url: input.url,
    title: input.title,
    capturedAt: now,
    order: input.order,
    progressStatus: input.progressStatus ?? DEFAULT_PAGE_PROGRESS_STATUS,
    notes: [],
    addedAt: now,
    updatedAt: now,
    ...(reason !== undefined ? { reason } : {}),
    ...(input.role !== undefined ? { role: input.role } : {}),
  }

  const found = await findPagesByNormalizedUrl(db, input.workspaceId, input.url)

  if (found.items.length > 0 && input.mode !== 'add-new-copy') {
    return {
      ok: true,
      value: {
        page: candidate,
        saved: false,
        matches: found.items,
        matchesCorrupted: found.corrupted,
        needsUserDecision: true,
      },
    }
  }

  // إضافة صفحة عمل مقصود على المهمة — يرفع lastWorkedAt ذرّيًا معها (0009).
  const written = await writeSavedPage(db, candidate, { workedAt: now })
  if (!written.ok) return { ok: false, error: fromStorageFailure(written) }

  return {
    ok: true,
    value: {
      page: candidate,
      saved: true,
      matches: found.items,
      matchesCorrupted: found.corrupted,
      needsUserDecision: false,
    },
  }
}

// ===== تحديث صفحة =====

export interface UpdatePageInput {
  title?: string
  reason?: string
  progressStatus?: PageProgressStatus
  role?: PageRole
  order?: number
  labels?: string[]
}

function labelsEqual(a: readonly string[] | undefined, b: readonly string[] | undefined): boolean {
  if (a === undefined || b === undefined) return a === b
  if (a.length !== b.length) return false
  return a.every((value, index) => value === b[index])
}

/** يحدّث حقول صفحة موجودة. لا حقل لتغيير workspaceId هنا — نقل الصفحة بين مساحات حالة استخدام مستقلة لاحقة. */
export async function updatePage(
  db: IDBDatabase,
  clock: Clock,
  id: SavedPageId,
  patch: UpdatePageInput,
): Promise<UseCaseResult<SavedPage>> {
  const current = fromReadResult(await readSavedPage(db, id), 'saved-page')
  if (!current.ok) return current
  const existing = current.value

  if (patch.order !== undefined && !isValidOrder(patch.order)) {
    return { ok: false, error: { kind: 'invalid-input', field: 'order' } }
  }

  const title = patch.title !== undefined ? patch.title : existing.title
  const reason = patch.reason !== undefined ? normalizeOptionalText(patch.reason) : existing.reason
  const progressStatus = patch.progressStatus ?? existing.progressStatus
  const role = patch.role !== undefined ? patch.role : existing.role
  const order = patch.order !== undefined ? patch.order : existing.order
  const labels = patch.labels !== undefined ? normalizeLabels(patch.labels) : existing.labels

  const changed =
    title !== existing.title ||
    reason !== existing.reason ||
    progressStatus !== existing.progressStatus ||
    role !== existing.role ||
    order !== existing.order ||
    !labelsEqual(labels, existing.labels)

  if (!changed) return { ok: true, value: existing }

  const now = clock.now()
  const updated: SavedPage = { ...existing, title, progressStatus, order, updatedAt: now }

  if (reason !== undefined) updated.reason = reason
  else delete updated.reason

  if (role !== undefined) updated.role = role
  else delete updated.role

  if (labels !== undefined) updated.labels = labels
  else delete updated.labels

  // تعديل صفحة عمل مقصود على المهمة (0009).
  const written = await writeSavedPage(db, updated, { workedAt: now })
  if (!written.ok) return { ok: false, error: fromStorageFailure(written) }

  return { ok: true, value: updated }
}

// ===== إعادة ترتيب صفحات مساحة =====

export interface ReorderEntry {
  pageId: SavedPageId
  order: number
}

/**
 * يحفظ ترتيبًا صريحًا لصفحات مساحة، ذرّيًا عبر writeSavedPages — كتابة واحدة
 * تنجح كليًا أو لا شيء، لا كتابات منفصلة معرَّضة لفشل جزئي. صفحات المساحة غير
 * المذكورة في entries تبقى بترتيبها الحالي دون تغيير — إعادة الترتيب تلمس فقط
 * ما طُلب صراحةً.
 */
export async function reorderPages(
  db: IDBDatabase,
  clock: Clock,
  workspaceId: WorkspaceId,
  entries: readonly ReorderEntry[],
): Promise<UseCaseResult<SavedPage[]>> {
  const seenIds = new Set<SavedPageId>()
  for (const entry of entries) {
    if (seenIds.has(entry.pageId)) {
      return { ok: false, error: { kind: 'invalid-input', field: 'pageId' } }
    }
    seenIds.add(entry.pageId)
    if (!isValidOrder(entry.order)) {
      return { ok: false, error: { kind: 'invalid-input', field: 'order' } }
    }
  }

  const listed = await listPagesByWorkspace(db, workspaceId)
  const pagesById = new Map(listed.items.map((page) => [page.id, page]))

  const now = clock.now()
  const updatedPages: SavedPage[] = []

  for (const entry of entries) {
    const page = pagesById.get(entry.pageId)
    if (page === undefined) {
      const corruptMatch = listed.corrupted.find((record) => record.key === entry.pageId)
      if (corruptMatch !== undefined) return { ok: false, error: fromStorageFailure(corruptMatch) }
      return { ok: false, error: { kind: 'not-found', entity: 'saved-page' } }
    }
    updatedPages.push({ ...page, order: entry.order, updatedAt: now })
  }

  // إعادة الترتيب تنظيم مقصود لصفحات المهمة — عمل عليها (0009).
  const written = await writeSavedPages(db, updatedPages, { workedAt: now })
  if (!written.ok) return { ok: false, error: fromStorageFailure(written) }

  return { ok: true, value: updatedPages }
}

// ===== حذف صفحة من المساحة — قرار 0018 =====

export interface RemovePageInput {
  pageId: SavedPageId
}

/**
 * يحذف الصفحة من مساحتها حذفًا نهائيًا مؤكدًا — التأكيد التدميري مسؤولية
 * الواجهة قبل الاستدعاء، ولا تراجع في V1 (سلة المحذوفات مؤجلة بقرار 0018).
 *
 * التنظيف الذرّي كله في طبقة التخزين: الملاحظات المضمَّنة تذهب مع السجل،
 * و`activePageId` يُمسح إن كان يشير إلى المحذوفة، ووقت النشاط يرتفع لأن
 * الحذف عمل مقصود على المهمة (0009).
 */
export async function removePage(
  db: IDBDatabase,
  clock: Clock,
  input: RemovePageInput,
): Promise<UseCaseResult<void>> {
  const written = await deleteSavedPage(db, input.pageId, { workedAt: clock.now() })
  if (!written.ok) return { ok: false, error: fromStorageFailure(written) }

  return { ok: true, value: undefined }
}

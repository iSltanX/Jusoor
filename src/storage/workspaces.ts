/**
 * سجل تخزين المساحات وعمليات القراءة والكتابة عليها.
 *
 * WorkspaceRecord مطابق لـ Workspace بنيويًا اليوم — لا حاجة لحقل مشتق إضافي.
 * الاسم مستقل يبقى نقطة تحويل واضحة إن احتاج التخزين حقلًا لا يخص المجال لاحقًا.
 */

import {
  SAVED_PAGES_BY_WORKSPACE_INDEX,
  SAVED_PAGES_STORE,
  WORKSPACES_STORE,
} from './database'
import { requestToPromise, transactionDone } from './idb'
import { bestEffortRecordKey, type ListResult, type ReadResult, type StorageResult } from './errors'
import type { Workspace } from '../core/workspace'
import { asSavedPageId, asWorkspaceId, type WorkspaceId } from '../core/ids'
import { isWorkspaceStatus, isWorkspaceTemplate, type WorkspaceStatus } from '../core/enums'
import {
  isDateOrderValid,
  isValidTimestamp,
  isValidWorkspaceName,
  isWorkspaceStatusConsistent,
} from '../core/validation'

export type WorkspaceRecord = Workspace

/** يحوّل مساحة من نموذج المجال إلى شكلها المخزَّن. متطابقان بنيويًا اليوم عمدًا. */
export function toWorkspaceRecord(workspace: Workspace): WorkspaceRecord {
  return workspace
}

/**
 * يحوّل سجلًا مجهولًا من IndexedDB إلى Workspace موثوق، أو يرفضه صراحةً.
 *
 * كل حقل يُتحقق من نوعه فعليًا قبل أي استخدام؛ asWorkspaceId/asSavedPageId
 * تُستدعيان فقط بعد تأكد الحقل سلسلة غير فارغة — لا بوصفهما تحققًا بديلًا.
 */
export function parseWorkspaceRecord(raw: unknown): StorageResult<Workspace> {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'storage/corrupt-record', details: 'record' }
  }
  const r = raw as Record<string, unknown>

  const id = r.id
  if (typeof id !== 'string' || id.trim() === '') {
    return { ok: false, error: 'storage/corrupt-record', details: 'id' }
  }

  const name = r.name
  if (typeof name !== 'string' || !isValidWorkspaceName(name)) {
    return { ok: false, error: 'storage/corrupt-record', details: 'name' }
  }

  const template = r.template
  if (!isWorkspaceTemplate(template)) {
    return { ok: false, error: 'storage/corrupt-record', details: 'template' }
  }

  const status = r.status
  if (!isWorkspaceStatus(status)) {
    return { ok: false, error: 'storage/corrupt-record', details: 'status' }
  }

  const createdAt = r.createdAt
  if (typeof createdAt !== 'number' || !isValidTimestamp(createdAt)) {
    return { ok: false, error: 'storage/corrupt-record', details: 'createdAt' }
  }

  const updatedAt = r.updatedAt
  if (typeof updatedAt !== 'number' || !isValidTimestamp(updatedAt)) {
    return { ok: false, error: 'storage/corrupt-record', details: 'updatedAt' }
  }

  const lastWorkedAt = r.lastWorkedAt
  if (typeof lastWorkedAt !== 'number' || !isValidTimestamp(lastWorkedAt)) {
    return { ok: false, error: 'storage/corrupt-record', details: 'lastWorkedAt' }
  }

  if (!isDateOrderValid(createdAt, updatedAt)) {
    return { ok: false, error: 'storage/corrupt-record', details: 'createdAt/updatedAt order' }
  }

  const frozenAt = r.frozenAt
  if (frozenAt !== undefined && (typeof frozenAt !== 'number' || !isValidTimestamp(frozenAt))) {
    return { ok: false, error: 'storage/corrupt-record', details: 'frozenAt' }
  }

  const archivedAt = r.archivedAt
  if (
    archivedAt !== undefined &&
    (typeof archivedAt !== 'number' || !isValidTimestamp(archivedAt))
  ) {
    return { ok: false, error: 'storage/corrupt-record', details: 'archivedAt' }
  }

  const statusShape: {
    status: WorkspaceStatus
    frozenAt?: number
    archivedAt?: number
  } = {
    status,
    ...(typeof frozenAt === 'number' ? { frozenAt } : {}),
    ...(typeof archivedAt === 'number' ? { archivedAt } : {}),
  }
  if (!isWorkspaceStatusConsistent(statusShape)) {
    return { ok: false, error: 'storage/corrupt-record', details: 'status consistency' }
  }

  const goal = r.goal
  if (goal !== undefined && typeof goal !== 'string') {
    return { ok: false, error: 'storage/corrupt-record', details: 'goal' }
  }
  const description = r.description
  if (description !== undefined && typeof description !== 'string') {
    return { ok: false, error: 'storage/corrupt-record', details: 'description' }
  }
  const generalNote = r.generalNote
  if (generalNote !== undefined && typeof generalNote !== 'string') {
    return { ok: false, error: 'storage/corrupt-record', details: 'generalNote' }
  }
  const lastReached = r.lastReached
  if (lastReached !== undefined && typeof lastReached !== 'string') {
    return { ok: false, error: 'storage/corrupt-record', details: 'lastReached' }
  }
  const nextStep = r.nextStep
  if (nextStep !== undefined && typeof nextStep !== 'string') {
    return { ok: false, error: 'storage/corrupt-record', details: 'nextStep' }
  }
  const activePageId = r.activePageId
  if (
    activePageId !== undefined &&
    (typeof activePageId !== 'string' || activePageId.trim() === '')
  ) {
    return { ok: false, error: 'storage/corrupt-record', details: 'activePageId' }
  }

  const workspace: Workspace = {
    id: asWorkspaceId(id),
    name,
    template,
    status,
    createdAt,
    updatedAt,
    lastWorkedAt,
    ...(typeof goal === 'string' ? { goal } : {}),
    ...(typeof description === 'string' ? { description } : {}),
    ...(typeof generalNote === 'string' ? { generalNote } : {}),
    ...(typeof lastReached === 'string' ? { lastReached } : {}),
    ...(typeof nextStep === 'string' ? { nextStep } : {}),
    ...(typeof activePageId === 'string' ? { activePageId: asSavedPageId(activePageId) } : {}),
    ...(typeof frozenAt === 'number' ? { frozenAt } : {}),
    ...(typeof archivedAt === 'number' ? { archivedAt } : {}),
  }

  return { ok: true, value: workspace }
}

/** مصدَّرة أيضًا لـ src/storage/workspace-with-pages.ts — الكتابة المركّبة الذرية تحتاج التحقق نفسه قبل فتح معاملتها. */
export function validateWorkspaceForWrite(workspace: Workspace): StorageResult<void> {
  if (!isValidWorkspaceName(workspace.name)) {
    return { ok: false, error: 'storage/invalid-write', details: 'name' }
  }
  if (
    !isValidTimestamp(workspace.createdAt) ||
    !isValidTimestamp(workspace.updatedAt) ||
    !isValidTimestamp(workspace.lastWorkedAt)
  ) {
    return { ok: false, error: 'storage/invalid-write', details: 'timestamps' }
  }
  if (!isDateOrderValid(workspace.createdAt, workspace.updatedAt)) {
    return { ok: false, error: 'storage/invalid-write', details: 'createdAt/updatedAt order' }
  }
  if (!isWorkspaceStatusConsistent(workspace)) {
    return { ok: false, error: 'storage/invalid-write', details: 'status consistency' }
  }
  return { ok: true, value: undefined }
}

/** يحفظ مساحة جديدة أو يحدّث مساحة قائمة — put واحدة تكفي كليهما. */
export async function writeWorkspace(
  db: IDBDatabase,
  workspace: Workspace,
): Promise<StorageResult<void>> {
  const validation = validateWorkspaceForWrite(workspace)
  if (!validation.ok) return validation

  const transaction = db.transaction(WORKSPACES_STORE, 'readwrite')
  transaction.objectStore(WORKSPACES_STORE).put(toWorkspaceRecord(workspace))
  await transactionDone(transaction)

  return { ok: true, value: undefined }
}

/** يقرأ مساحة بمعرفها، مميّزًا الغياب عن التلف عن النجاح صراحةً. */
export async function readWorkspace(
  db: IDBDatabase,
  id: WorkspaceId,
): Promise<ReadResult<Workspace>> {
  const transaction = db.transaction(WORKSPACES_STORE, 'readonly')
  const raw: unknown = await requestToPromise(transaction.objectStore(WORKSPACES_STORE).get(id))

  if (raw === undefined) return { status: 'not-found' }

  const parsed = parseWorkspaceRecord(raw)
  if (!parsed.ok) {
    return {
      status: 'corrupt',
      error: parsed.error,
      ...(parsed.details !== undefined ? { details: parsed.details } : {}),
    }
  }

  return { status: 'found', value: parsed.value }
}

/** ترتيب محايد تقنيًا: الأقدم إنشاءً أولًا، وid حسمًا أخيرًا عند تطابق createdAt. */
function compareByCreatedAt(a: Workspace, b: Workspace): number {
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/**
 * يسرد كل المساحات، مرتبة ترتيبًا محايدًا تقنيًا (الأقدم إنشاءً أولًا).
 *
 * هذا ليس قرار تجربة استخدام نهائيًا: شاشة المساحات الفعلية (دستور المنتج §10.1)
 * قد ترتب بالأحدث عملًا أو بالحالة، وهو قرار واجهة لاحق خارج نطاق هذه المرحلة.
 *
 * السجلات التالفة **لا تختفي صامتة**: تُفصل في `corrupted` بدل استبعادها من
 * النتيجة دون أثر، ولا تُعامل بوصفها كيانًا صحيحًا في `items`. سجل واحد فاسد
 * لا يُسقط بقية المساحات الصالحة — وهذا ما يمنع رفض العملية كلها لأجله.
 */
export async function listWorkspaces(db: IDBDatabase): Promise<ListResult<Workspace>> {
  const transaction = db.transaction(WORKSPACES_STORE, 'readonly')
  const rawRecords: unknown[] = await requestToPromise(
    transaction.objectStore(WORKSPACES_STORE).getAll(),
  )

  const items: Workspace[] = []
  const corrupted: ListResult<Workspace>['corrupted'] = []

  for (const raw of rawRecords) {
    const parsed = parseWorkspaceRecord(raw)
    if (parsed.ok) {
      items.push(parsed.value)
      continue
    }

    const key = bestEffortRecordKey(raw)
    corrupted.push({
      store: WORKSPACES_STORE,
      error: parsed.error,
      ...(key !== undefined ? { key } : {}),
      ...(parsed.details !== undefined ? { details: parsed.details } : {}),
    })
  }

  return { items: items.sort(compareByCreatedAt), corrupted }
}

// ===== حذف مساحة كاملة — قرار 0018 =====

/**
 * يحذف المساحة وكل صفحاتها حذفًا نهائيًا ذرّيًا.
 *
 * الملاحظات مضمَّنة داخل سجلات الصفحات (0009) فتذهب معها؛ ولا فهارس مستقلة
 * سوى فهرس `by-workspace` الذي يزول بزوال سجلاته — لا بيانات يتيمة.
 *
 * مؤشر «آخر مساحة مستخدمة» يسكن `chrome.storage.local` خارج هذه القاعدة،
 * وتنظيفه مسؤولية طبقة app بعد نجاح الحذف (وهو مؤشر لا يُوثق به أصلًا —
 * انظر core/settings).
 *
 * معاملة واحدة على المخزنين: فشل أي خطوة يُجهض الكل فلا حالة وسطى.
 */
export async function deleteWorkspaceWithPages(
  db: IDBDatabase,
  id: WorkspaceId,
): Promise<StorageResult<{ deletedPages: number }>> {
  const transaction = db.transaction([WORKSPACES_STORE, SAVED_PAGES_STORE], 'readwrite')
  const workspacesStore = transaction.objectStore(WORKSPACES_STORE)

  const raw: unknown = await requestToPromise(workspacesStore.get(id))
  if (raw === undefined) {
    transaction.abort()
    return { ok: false, error: 'storage/invalid-write', details: 'workspace not found' }
  }

  const pagesStore = transaction.objectStore(SAVED_PAGES_STORE)
  const index = pagesStore.index(SAVED_PAGES_BY_WORKSPACE_INDEX)
  const pageKeys: IDBValidKey[] = await requestToPromise(index.getAllKeys(id))

  for (const key of pageKeys) pagesStore.delete(key)
  workspacesStore.delete(id)

  await transactionDone(transaction)
  return { ok: true, value: { deletedPages: pageKeys.length } }
}

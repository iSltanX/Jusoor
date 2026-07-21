/**
 * سجل تخزين الصفحات المحفوظة وملاحظاتها المضمَّنة، وعمليات القراءة والكتابة عليها.
 *
 * SavedPageRecord مطابق لـ SavedPage بنيويًا اليوم — لا urlKey ولا أي حقل مشتق آخر.
 * اكتشاف التكرار (findPagesByNormalizedUrl) يعيد حساب normalizeUrlForComparison
 * على كل مرشح وقت القراءة عبر فهرس workspaceId وحده، فلا حاجة إلى تخزين قيمة
 * مقارنة مشتقة عند هذا الحجم المتوقع — انظر تقرير التسليم لتفصيل هذا الاختيار.
 *
 * PageNote مضمَّنة داخل notes[]، لا كيان مستقل ولا مخزن مستقل — القرار معتمد في
 * docs/decisions/0009-data-model.md. عمليات الملاحظات هنا تقرأ وتكتب صفحتها
 * الأم بمعاملة واحدة، فتبدو للمستدعي عمليات مستقلة دون كسر ذلك القرار.
 */

import { SAVED_PAGES_BY_WORKSPACE_INDEX, SAVED_PAGES_STORE, WORKSPACES_STORE } from './database'
import { requestToPromise, transactionDone } from './idb'
import {
  bestEffortRecordKey,
  type ListResult,
  type ReadResult,
  type StorageResult,
} from './errors'
import {
  parseWorkspaceRecord,
  toWorkspaceRecord,
  validateWorkspaceForWrite,
} from './workspaces'
import type { PageNote, SavedPage } from '../core/page'
import {
  asPageNoteId,
  asSavedPageId,
  asWorkspaceId,
  type PageNoteId,
  type SavedPageId,
  type WorkspaceId,
} from '../core/ids'
import { isPageProgressStatus, isPageRole } from '../core/enums'
import {
  isDateOrderValid,
  isValidNoteBody,
  isValidOrder,
  isValidPageUrl,
  isValidTimestamp,
} from '../core/validation'
import { normalizeUrlForComparison } from '../core/url'

export type SavedPageRecord = SavedPage

/** يحوّل صفحة من نموذج المجال إلى شكلها المخزَّن. متطابقان بنيويًا اليوم عمدًا. */
export function toSavedPageRecord(page: SavedPage): SavedPageRecord {
  return page
}

function parsePageNote(raw: unknown): StorageResult<PageNote> {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'storage/corrupt-record', details: 'note' }
  }
  const r = raw as Record<string, unknown>

  const id = r.id
  if (typeof id !== 'string' || id.trim() === '') {
    return { ok: false, error: 'storage/corrupt-record', details: 'note.id' }
  }

  const body = r.body
  if (typeof body !== 'string' || !isValidNoteBody(body)) {
    return { ok: false, error: 'storage/corrupt-record', details: 'note.body' }
  }

  const createdAt = r.createdAt
  if (typeof createdAt !== 'number' || !isValidTimestamp(createdAt)) {
    return { ok: false, error: 'storage/corrupt-record', details: 'note.createdAt' }
  }

  const updatedAt = r.updatedAt
  if (typeof updatedAt !== 'number' || !isValidTimestamp(updatedAt)) {
    return { ok: false, error: 'storage/corrupt-record', details: 'note.updatedAt' }
  }

  if (!isDateOrderValid(createdAt, updatedAt)) {
    return { ok: false, error: 'storage/corrupt-record', details: 'note dates order' }
  }

  return { ok: true, value: { id: asPageNoteId(id), body, createdAt, updatedAt } }
}

/**
 * يحوّل سجلًا مجهولًا من IndexedDB إلى SavedPage موثوق، أو يرفضه صراحةً.
 *
 * تلف ملاحظة واحدة داخل notes[] يرفض الصفحة كلها — لا يُسقطها المُحلِّل صامتًا،
 * لأن إسقاطها يعني فقدان بيانات المستخدم دون علمه.
 */
export function parseSavedPageRecord(raw: unknown): StorageResult<SavedPage> {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'storage/corrupt-record', details: 'record' }
  }
  const r = raw as Record<string, unknown>

  const id = r.id
  if (typeof id !== 'string' || id.trim() === '') {
    return { ok: false, error: 'storage/corrupt-record', details: 'id' }
  }

  const workspaceId = r.workspaceId
  if (typeof workspaceId !== 'string' || workspaceId.trim() === '') {
    return { ok: false, error: 'storage/corrupt-record', details: 'workspaceId' }
  }

  const url = r.url
  if (typeof url !== 'string' || !isValidPageUrl(url)) {
    return { ok: false, error: 'storage/corrupt-record', details: 'url' }
  }

  const title = r.title
  if (typeof title !== 'string') {
    return { ok: false, error: 'storage/corrupt-record', details: 'title' }
  }

  const capturedAt = r.capturedAt
  if (typeof capturedAt !== 'number' || !isValidTimestamp(capturedAt)) {
    return { ok: false, error: 'storage/corrupt-record', details: 'capturedAt' }
  }

  const order = r.order
  if (typeof order !== 'number' || !isValidOrder(order)) {
    return { ok: false, error: 'storage/corrupt-record', details: 'order' }
  }

  const progressStatus = r.progressStatus
  if (!isPageProgressStatus(progressStatus)) {
    return { ok: false, error: 'storage/corrupt-record', details: 'progressStatus' }
  }

  const role = r.role
  if (role !== undefined && !isPageRole(role)) {
    return { ok: false, error: 'storage/corrupt-record', details: 'role' }
  }

  const addedAt = r.addedAt
  if (typeof addedAt !== 'number' || !isValidTimestamp(addedAt)) {
    return { ok: false, error: 'storage/corrupt-record', details: 'addedAt' }
  }

  const updatedAt = r.updatedAt
  if (typeof updatedAt !== 'number' || !isValidTimestamp(updatedAt)) {
    return { ok: false, error: 'storage/corrupt-record', details: 'updatedAt' }
  }

  const faviconUrl = r.faviconUrl
  if (faviconUrl !== undefined && typeof faviconUrl !== 'string') {
    return { ok: false, error: 'storage/corrupt-record', details: 'faviconUrl' }
  }

  const reason = r.reason
  if (reason !== undefined && typeof reason !== 'string') {
    return { ok: false, error: 'storage/corrupt-record', details: 'reason' }
  }

  const labels = r.labels
  if (labels !== undefined) {
    if (!Array.isArray(labels) || !labels.every((l): l is string => typeof l === 'string')) {
      return { ok: false, error: 'storage/corrupt-record', details: 'labels' }
    }
  }

  const rawNotes = r.notes
  if (!Array.isArray(rawNotes)) {
    return { ok: false, error: 'storage/corrupt-record', details: 'notes' }
  }
  const notes: PageNote[] = []
  for (const rawNote of rawNotes) {
    const parsedNote = parsePageNote(rawNote)
    if (!parsedNote.ok) return parsedNote
    notes.push(parsedNote.value)
  }

  const page: SavedPage = {
    id: asSavedPageId(id),
    workspaceId: asWorkspaceId(workspaceId),
    url,
    title,
    capturedAt,
    order,
    progressStatus,
    notes,
    addedAt,
    updatedAt,
    ...(typeof faviconUrl === 'string' ? { faviconUrl } : {}),
    ...(typeof reason === 'string' ? { reason } : {}),
    ...(isPageRole(role) ? { role } : {}),
    ...(Array.isArray(labels) ? { labels } : {}),
  }

  return { ok: true, value: page }
}

/** مصدَّرة أيضًا لـ src/storage/workspace-with-pages.ts — الكتابة المركّبة الذرية تحتاج التحقق نفسه قبل فتح معاملتها. */
export function validatePageForWrite(page: SavedPage): StorageResult<void> {
  if (!isValidPageUrl(page.url)) {
    return { ok: false, error: 'storage/invalid-write', details: 'url' }
  }
  if (!isValidOrder(page.order)) {
    return { ok: false, error: 'storage/invalid-write', details: 'order' }
  }
  if (
    !isValidTimestamp(page.capturedAt) ||
    !isValidTimestamp(page.addedAt) ||
    !isValidTimestamp(page.updatedAt)
  ) {
    return { ok: false, error: 'storage/invalid-write', details: 'timestamps' }
  }
  for (const note of page.notes) {
    if (!isValidNoteBody(note.body)) {
      return { ok: false, error: 'storage/invalid-write', details: 'note.body' }
    }
  }
  return { ok: true, value: undefined }
}

/**
 * خيارات مشتركة لكتابات الصفحات والملاحظات.
 *
 * `workedAt` هو ما يفرّق بين «تغيير سجل» و«عمل مقصود على المهمة»: تمريره يرفع
 * `lastWorkedAt` للمساحة **في المعاملة نفسها** — تنجحان معًا أو تفشلان معًا،
 * فلا صفحة محفوظة بوقت نشاط قديم ولا العكس. الجدول الحاسم لمن يمرّره ومن لا
 * يمرّره في `docs/decisions/0009-data-model.md`.
 */
export interface PageWriteOptions {
  workedAt?: number
}

/**
 * يرفع وقت آخر عمل على المساحة ضمن معاملة قائمة تشمل مخزن المساحات.
 *
 * لا يُستدعى إلا داخل معاملة فُتحت على المخزنين معًا؛ استدعاؤه على معاملة
 * لا تشمل `workspaces` يرمي — وهذا مقصود: خطأ برمجي لا حالة تُعالَج.
 */
async function applyWorkspaceActivity(
  transaction: IDBTransaction,
  workspaceId: WorkspaceId,
  workedAt: number,
): Promise<StorageResult<void>> {
  const store = transaction.objectStore(WORKSPACES_STORE)
  const raw: unknown = await requestToPromise(store.get(workspaceId))

  if (raw === undefined) {
    return { ok: false, error: 'storage/invalid-write', details: 'workspace not found' }
  }

  const parsed = parseWorkspaceRecord(raw)
  if (!parsed.ok) return parsed

  const next = { ...parsed.value, lastWorkedAt: workedAt, updatedAt: workedAt }

  const validation = validateWorkspaceForWrite(next)
  if (!validation.ok) return validation

  store.put(toWorkspaceRecord(next))
  return { ok: true, value: undefined }
}

/** المخازن التي تحتاجها معاملة كتابة صفحة، بحسب طلب رفع وقت النشاط من عدمه. */
function storesFor(options: PageWriteOptions): string[] {
  return options.workedAt === undefined
    ? [SAVED_PAGES_STORE]
    : [SAVED_PAGES_STORE, WORKSPACES_STORE]
}

/** ترتيب حتمي: order تصاعديًا، ثم addedAt عند التعادل، ثم id حسمًا أخيرًا مضمونًا. */
function compareByOrder(a: SavedPage, b: SavedPage): number {
  if (a.order !== b.order) return a.order - b.order
  if (a.addedAt !== b.addedAt) return a.addedAt - b.addedAt
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/** يحفظ صفحة جديدة أو يحدّث صفحة قائمة — put واحدة تكفي كليهما. */
export async function writeSavedPage(
  db: IDBDatabase,
  page: SavedPage,
  options: PageWriteOptions = {},
): Promise<StorageResult<void>> {
  const validation = validatePageForWrite(page)
  if (!validation.ok) return validation

  const transaction = db.transaction(storesFor(options), 'readwrite')
  transaction.objectStore(SAVED_PAGES_STORE).put(toSavedPageRecord(page))

  if (options.workedAt !== undefined) {
    const activity = await applyWorkspaceActivity(transaction, page.workspaceId, options.workedAt)
    if (!activity.ok) {
      transaction.abort()
      return activity
    }
  }

  await transactionDone(transaction)

  return { ok: true, value: undefined }
}

/**
 * يكتب عدة صفحات في معاملة IndexedDB واحدة — إما تنجح كلها معًا أو لا شيء.
 *
 * لإعادة ترتيب عدة صفحات ذرّيًا (app/) بدل تنفيذ عدة كتابات منفصلة معرَّضة
 * للفشل الجزئي. كل صفحة تُتحقق قبل فتح أي معاملة؛ صفحة واحدة غير صالحة ضمن
 * الدفعة تمنع كتابة الدفعة **كلها**، بما فيها الصفحات الصالحة الأخرى ضمنها —
 * فلا حاجة إلى تراجع يدوي: لم تُفتح معاملة أصلًا.
 */
export async function writeSavedPages(
  db: IDBDatabase,
  pages: readonly SavedPage[],
  options: PageWriteOptions = {},
): Promise<StorageResult<void>> {
  for (const page of pages) {
    const validation = validatePageForWrite(page)
    if (!validation.ok) return validation
  }

  const first = pages[0]

  // رفع وقت النشاط يخص مساحة واحدة؛ دفعة تخلط مساحتين تجعل «أي مساحة عملت
  // عليها» سؤالًا بلا جواب واحد، فتُرفض بدل اختيار إحداها اعتباطًا.
  if (options.workedAt !== undefined && first !== undefined) {
    if (pages.some((page) => page.workspaceId !== first.workspaceId)) {
      return { ok: false, error: 'storage/invalid-write', details: 'mixed workspaces in batch' }
    }
  }

  const transaction = db.transaction(storesFor(options), 'readwrite')
  const store = transaction.objectStore(SAVED_PAGES_STORE)
  for (const page of pages) {
    store.put(toSavedPageRecord(page))
  }

  if (options.workedAt !== undefined && first !== undefined) {
    const activity = await applyWorkspaceActivity(transaction, first.workspaceId, options.workedAt)
    if (!activity.ok) {
      transaction.abort()
      return activity
    }
  }

  await transactionDone(transaction)

  return { ok: true, value: undefined }
}

/** يقرأ صفحة بمعرفها، مميّزًا الغياب عن التلف عن النجاح صراحةً. */
export async function readSavedPage(
  db: IDBDatabase,
  id: SavedPageId,
): Promise<ReadResult<SavedPage>> {
  const transaction = db.transaction(SAVED_PAGES_STORE, 'readonly')
  const raw: unknown = await requestToPromise(transaction.objectStore(SAVED_PAGES_STORE).get(id))

  if (raw === undefined) return { status: 'not-found' }

  const parsed = parseSavedPageRecord(raw)
  if (!parsed.ok) {
    return {
      status: 'corrupt',
      error: parsed.error,
      ...(parsed.details !== undefined ? { details: parsed.details } : {}),
    }
  }

  return { status: 'found', value: parsed.value }
}

/**
 * يسرد صفحات مساحة واحدة بترتيب order حتمي.
 *
 * السجلات التالفة **لا تختفي صامتة**: تُفصل في `corrupted` بدل استبعادها دون
 * أثر. سجل واحد فاسد لا يُسقط بقية صفحات المساحة الصالحة من `items`.
 */
export async function listPagesByWorkspace(
  db: IDBDatabase,
  workspaceId: WorkspaceId,
): Promise<ListResult<SavedPage>> {
  const transaction = db.transaction(SAVED_PAGES_STORE, 'readonly')
  const index = transaction.objectStore(SAVED_PAGES_STORE).index(SAVED_PAGES_BY_WORKSPACE_INDEX)
  const rawRecords: unknown[] = await requestToPromise(index.getAll(workspaceId))

  const items: SavedPage[] = []
  const corrupted: ListResult<SavedPage>['corrupted'] = []

  for (const raw of rawRecords) {
    const parsed = parseSavedPageRecord(raw)
    if (parsed.ok) {
      items.push(parsed.value)
      continue
    }

    const key = bestEffortRecordKey(raw)
    corrupted.push({
      store: SAVED_PAGES_STORE,
      error: parsed.error,
      ...(key !== undefined ? { key } : {}),
      ...(parsed.details !== undefined ? { details: parsed.details } : {}),
    })
  }

  return { items: items.sort(compareByOrder), corrupted }
}

/**
 * يعدّ صفحات كل مساحة عبر الفهرس، دون تحميل السجلات نفسها.
 *
 * `index.count(key)` يعدّ داخل المحرك، فلا تُنقل ملاحظات كل صفحة إلى الذاكرة
 * لمجرد عرض رقم في بطاقة. معاملة واحدة لكل المساحات لا معاملة لكل واحدة.
 */
export async function countPagesByWorkspace(
  db: IDBDatabase,
  workspaceIds: readonly WorkspaceId[],
): Promise<Map<WorkspaceId, number>> {
  const counts = new Map<WorkspaceId, number>()
  if (workspaceIds.length === 0) return counts

  const transaction = db.transaction(SAVED_PAGES_STORE, 'readonly')
  const index = transaction.objectStore(SAVED_PAGES_STORE).index(SAVED_PAGES_BY_WORKSPACE_INDEX)

  await Promise.all(
    workspaceIds.map(async (workspaceId) => {
      counts.set(workspaceId, await requestToPromise(index.count(workspaceId)))
    }),
  )

  return counts
}

/**
 * يبحث عن صفحات مساحة واحدة يتطابق رابطها بعد التطبيع مع الرابط الممرَّر.
 *
 * اكتشاف تكرار فقط — دستور المنتج §9.5: لا يحذف ولا يدمج ولا يمنع أي شيء
 * تلقائيًا. يعيد المرشحين المحتملين بروابطهم الأصلية كما هي، ويترك القرار
 * (فتح الموجودة، إضافة نسخة أخرى، تحديث بياناتها، أو تجاهل التنبيه) لمن
 * يستدعيه لاحقًا — هذه الدالة لا تعرف ولا تقرر أيًّا من ذلك.
 *
 * سجل تالف ضمن صفحات المساحة لا يمكن التحقق من تطابق رابطه (قد يكون الحقل
 * `url` نفسه هو التالف)؛ يُفصل في `corrupted` بدل إسقاطه صامتًا، لأن إسقاطه
 * قد يُقنع المستخدم زورًا بغياب تكرار فعلي.
 */
export async function findPagesByNormalizedUrl(
  db: IDBDatabase,
  workspaceId: WorkspaceId,
  url: string,
): Promise<ListResult<SavedPage>> {
  const targetKey = normalizeUrlForComparison(url)

  const transaction = db.transaction(SAVED_PAGES_STORE, 'readonly')
  const index = transaction.objectStore(SAVED_PAGES_STORE).index(SAVED_PAGES_BY_WORKSPACE_INDEX)
  const rawRecords: unknown[] = await requestToPromise(index.getAll(workspaceId))

  const items: SavedPage[] = []
  const corrupted: ListResult<SavedPage>['corrupted'] = []

  for (const raw of rawRecords) {
    const parsed = parseSavedPageRecord(raw)
    if (!parsed.ok) {
      const key = bestEffortRecordKey(raw)
      corrupted.push({
        store: SAVED_PAGES_STORE,
        error: parsed.error,
        ...(key !== undefined ? { key } : {}),
        ...(parsed.details !== undefined ? { details: parsed.details } : {}),
      })
      continue
    }

    if (normalizeUrlForComparison(parsed.value.url) === targetKey) {
      items.push(parsed.value)
    }
  }

  return { items: items.sort(compareByOrder), corrupted }
}

/**
 * يحفظ ملاحظة جديدة أو يحدّث ملاحظة قائمة داخل صفحة، بقراءة وكتابة الصفحة
 * الأم ذرّيًا ضمن معاملة IndexedDB واحدة — لا قراءة ثم كتابة عبر معاملتين
 * منفصلتين قد تتداخل معهما كتابة أخرى بينهما.
 *
 * لا يلمس أي حقل في الصفحة غير notes، ولا سيما لا يغيّر updatedAt: ضبط وقت
 * النشاط قرار حالة استخدام تقرره app/ لاحقًا، لا تخزين يقرره نيابة عنها.
 */
export async function writePageNote(
  db: IDBDatabase,
  savedPageId: SavedPageId,
  note: PageNote,
  options: PageWriteOptions = {},
): Promise<StorageResult<void>> {
  if (!isValidNoteBody(note.body)) {
    return { ok: false, error: 'storage/invalid-write', details: 'body' }
  }
  if (
    !isValidTimestamp(note.createdAt) ||
    !isValidTimestamp(note.updatedAt) ||
    !isDateOrderValid(note.createdAt, note.updatedAt)
  ) {
    return { ok: false, error: 'storage/invalid-write', details: 'timestamps' }
  }

  const transaction = db.transaction(storesFor(options), 'readwrite')
  const store = transaction.objectStore(SAVED_PAGES_STORE)

  const raw: unknown = await requestToPromise(store.get(savedPageId))
  if (raw === undefined) {
    transaction.abort()
    return { ok: false, error: 'storage/invalid-write', details: 'savedPageId not found' }
  }

  const parsed = parseSavedPageRecord(raw)
  if (!parsed.ok) {
    transaction.abort()
    return {
      ok: false,
      error: parsed.error,
      ...(parsed.details !== undefined ? { details: parsed.details } : {}),
    }
  }

  const page = parsed.value
  const existingIndex = page.notes.findIndex((existing) => existing.id === note.id)
  const nextNotes =
    existingIndex === -1
      ? [...page.notes, note]
      : page.notes.map((existing, index) => (index === existingIndex ? note : existing))

  store.put(toSavedPageRecord({ ...page, notes: nextNotes }))

  if (options.workedAt !== undefined) {
    const activity = await applyWorkspaceActivity(transaction, page.workspaceId, options.workedAt)
    if (!activity.ok) {
      transaction.abort()
      return activity
    }
  }

  await transactionDone(transaction)

  return { ok: true, value: undefined }
}

/**
 * يحذف ملاحظة واحدة من صفحة، بقراءة وكتابة الصفحة الأم ذرّيًا ضمن معاملة واحدة.
 *
 * يحذف الملاحظة فقط — لا الصفحة ولا المساحة، ولا يمس حقلًا آخر في الصفحة.
 * سياسات حذف الصفحة أو المساحة أو سلة المحذوفات قرار مستقل مؤجَّل عمدًا —
 * دستور المنتج §9.11 يميّز بين إزالة الرابط وحذف بيانات المستخدم كاملة، وهذا
 * تمييز لا يُحسم هنا. حذف ملاحظة غير موجودة أصلًا عملية بلا أثر (لا خطأ)؛
 * التحقق من وجودها قبل الحذف مسؤولية المستدعي في app/ إن أراد تمييزًا واضحًا.
 */
export async function deletePageNote(
  db: IDBDatabase,
  savedPageId: SavedPageId,
  noteId: PageNoteId,
  options: PageWriteOptions = {},
): Promise<StorageResult<void>> {
  const transaction = db.transaction(storesFor(options), 'readwrite')
  const store = transaction.objectStore(SAVED_PAGES_STORE)

  const raw: unknown = await requestToPromise(store.get(savedPageId))
  if (raw === undefined) {
    transaction.abort()
    return { ok: false, error: 'storage/invalid-write', details: 'savedPageId not found' }
  }

  const parsed = parseSavedPageRecord(raw)
  if (!parsed.ok) {
    transaction.abort()
    return {
      ok: false,
      error: parsed.error,
      ...(parsed.details !== undefined ? { details: parsed.details } : {}),
    }
  }

  const page = parsed.value
  const nextNotes = page.notes.filter((existing) => existing.id !== noteId)

  store.put(toSavedPageRecord({ ...page, notes: nextNotes }))

  if (options.workedAt !== undefined) {
    const activity = await applyWorkspaceActivity(transaction, page.workspaceId, options.workedAt)
    if (!activity.ok) {
      transaction.abort()
      return activity
    }
  }

  await transactionDone(transaction)

  return { ok: true, value: undefined }
}

/** يقرأ ملاحظة بمعرفها ضمن صفحة محددة — لا معرّف عالمي للملاحظة عبر الصفحات. */
export async function readPageNote(
  db: IDBDatabase,
  savedPageId: SavedPageId,
  noteId: PageNoteId,
): Promise<ReadResult<PageNote>> {
  const pageResult = await readSavedPage(db, savedPageId)

  if (pageResult.status === 'not-found') return { status: 'not-found' }
  if (pageResult.status === 'corrupt') {
    return {
      status: 'corrupt',
      error: pageResult.error,
      ...(pageResult.details !== undefined ? { details: pageResult.details } : {}),
    }
  }

  const note = pageResult.value.notes.find((candidate) => candidate.id === noteId)
  return note === undefined ? { status: 'not-found' } : { status: 'found', value: note }
}

/**
 * يسرد ملاحظات صفحة بترتيب إدراجها المخزَّن.
 *
 * صفحة غائبة فعلًا تعيد قائمة فارغة بلا تلف. صفحة **تالفة** حالة مختلفة تمامًا
 * ولا تُعامَل كغياب: لا يمكن معرفة ملاحظاتها لأن الصفحة الأم نفسها غير قابلة
 * للقراءة، فيُبلَّغ بذلك عبر `corrupted` بدل الإيحاء الصامت بأن لا ملاحظات إطلاقًا.
 */
export async function listPageNotes(
  db: IDBDatabase,
  savedPageId: SavedPageId,
): Promise<ListResult<PageNote>> {
  const pageResult = await readSavedPage(db, savedPageId)

  if (pageResult.status === 'found') return { items: pageResult.value.notes, corrupted: [] }
  if (pageResult.status === 'not-found') return { items: [], corrupted: [] }

  return {
    items: [],
    corrupted: [
      {
        store: SAVED_PAGES_STORE,
        key: savedPageId,
        error: pageResult.error,
        ...(pageResult.details !== undefined ? { details: pageResult.details } : {}),
      },
    ],
  }
}

// ===== حذف صفحة — قرار 0018 =====

/**
 * يحذف صفحة من مساحتها حذفًا نهائيًا، ذرّيًا، مع تنظيف كل ما يتبعها:
 *
 * - سجل الصفحة يُحذف بملاحظاته المضمَّنة (PageNote تعيش داخل SavedPage.notes —
 *   قرار 0009 — فلا مخزن ملاحظات مستقلًا يترك يتيمًا).
 * - `activePageId` في المساحة يُمسح إن كان يشير إلى الصفحة المحذوفة — لا مرجع
 *   يتيم يفتح لاحقًا رابطًا محذوفًا.
 * - وقت النشاط يرتفع: الحذف عمل مقصود على المهمة (0009).
 *
 * كل ذلك في معاملة واحدة على المخزنين: فشل أي خطوة يُجهض الكل فلا حالة وسطى.
 */
export async function deleteSavedPage(
  db: IDBDatabase,
  id: SavedPageId,
  options: { workedAt: number },
): Promise<StorageResult<void>> {
  const transaction = db.transaction([SAVED_PAGES_STORE, WORKSPACES_STORE], 'readwrite')
  const pagesStore = transaction.objectStore(SAVED_PAGES_STORE)

  const rawPage: unknown = await requestToPromise(pagesStore.get(id))
  if (rawPage === undefined) {
    transaction.abort()
    return { ok: false, error: 'storage/invalid-write', details: 'page not found' }
  }

  const parsedPage = parseSavedPageRecord(rawPage)
  if (!parsedPage.ok) {
    transaction.abort()
    return parsedPage
  }

  const workspacesStore = transaction.objectStore(WORKSPACES_STORE)
  const rawWorkspace: unknown = await requestToPromise(
    workspacesStore.get(parsedPage.value.workspaceId),
  )
  if (rawWorkspace === undefined) {
    transaction.abort()
    return { ok: false, error: 'storage/invalid-write', details: 'workspace not found' }
  }

  const parsedWorkspace = parseWorkspaceRecord(rawWorkspace)
  if (!parsedWorkspace.ok) {
    transaction.abort()
    return parsedWorkspace
  }

  const next = { ...parsedWorkspace.value, lastWorkedAt: options.workedAt, updatedAt: options.workedAt }
  if (next.activePageId === id) delete next.activePageId

  const validation = validateWorkspaceForWrite(next)
  if (!validation.ok) {
    transaction.abort()
    return validation
  }

  pagesStore.delete(id)
  workspacesStore.put(toWorkspaceRecord(next))

  await transactionDone(transaction)
  return { ok: true, value: undefined }
}

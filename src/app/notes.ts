/**
 * حالات الاستخدام الأساسية لملاحظة الصفحة: إضافة، تحديث، حذف.
 *
 * الملاحظة مضمَّنة داخل SavedPage.notes في storage/ اليوم، لكن app/ لا يعرف
 * تفصيل التضمين هذا: يستدعي فقط writePageNote/deletePageNote/readPageNote،
 * وهذه العقود تُخفي كيفية القراءة والكتابة فعليًا خلفها.
 */

import type { Clock } from './clock'
import type { IdGenerator } from './ids'
import { fromReadResult, fromStorageFailure, type UseCaseResult } from './errors'
import { deletePageNote, readPageNote, readSavedPage, writePageNote } from '../storage/pages'
import type { PageNoteId, SavedPageId } from '../core/ids'
import type { PageNote } from '../core/page'
import { isValidNoteBody } from '../core/validation'

// ===== إضافة ملاحظة =====

export interface AddNoteInput {
  savedPageId: SavedPageId
  body: string
}

/** يضيف ملاحظة جديدة إلى صفحة موجودة. لا trimming أو إعادة صياغة لنص الملاحظة — يُحفظ حرفيًا. */
export async function addNote(
  db: IDBDatabase,
  clock: Clock,
  ids: IdGenerator,
  input: AddNoteInput,
): Promise<UseCaseResult<PageNote>> {
  const pageResult = fromReadResult(await readSavedPage(db, input.savedPageId), 'saved-page')
  if (!pageResult.ok) return pageResult

  if (!isValidNoteBody(input.body)) {
    return { ok: false, error: { kind: 'invalid-input', field: 'body' } }
  }

  const now = clock.now()
  const note: PageNote = { id: ids.pageNoteId(), body: input.body, createdAt: now, updatedAt: now }

  // إضافة ملاحظة عمل مقصود على المهمة — يرفع lastWorkedAt ذرّيًا معها (0009).
  const written = await writePageNote(db, input.savedPageId, note, { workedAt: now })
  if (!written.ok) return { ok: false, error: fromStorageFailure(written) }

  return { ok: true, value: note }
}

// ===== تحديث ملاحظة =====

export interface UpdateNoteInput {
  savedPageId: SavedPageId
  noteId: PageNoteId
  body: string
}

/** يحدّث نص ملاحظة موجودة ووقتها فقط. لا يغيّر id ولا يغيّر ارتباطها بصفحتها. */
export async function updateNote(
  db: IDBDatabase,
  clock: Clock,
  input: UpdateNoteInput,
): Promise<UseCaseResult<PageNote>> {
  const existingResult = fromReadResult(
    await readPageNote(db, input.savedPageId, input.noteId),
    'page-note',
  )
  if (!existingResult.ok) return existingResult

  if (!isValidNoteBody(input.body)) {
    return { ok: false, error: { kind: 'invalid-input', field: 'body' } }
  }

  const existing = existingResult.value
  if (input.body === existing.body) return { ok: true, value: existing }

  const now = clock.now()
  const updated: PageNote = {
    id: existing.id,
    body: input.body,
    createdAt: existing.createdAt,
    updatedAt: now,
  }

  // تعديل ملاحظة عمل مقصود على المهمة (0009).
  const written = await writePageNote(db, input.savedPageId, updated, { workedAt: now })
  if (!written.ok) return { ok: false, error: fromStorageFailure(written) }

  return { ok: true, value: updated }
}

// ===== حذف ملاحظة =====

export interface DeleteNoteInput {
  savedPageId: SavedPageId
  noteId: PageNoteId
}

/**
 * يحذف ملاحظة واحدة فقط. حذف الصفحة والمساحة حالتا استخدام مستقلتان
 * (قرار 0018 — removePage وdeleteWorkspaceEntirely)، ولا سلة محذوفات ولا
 * تراجع زمني في V1 (§9.11).
 */
export async function deleteNote(
  db: IDBDatabase,
  clock: Clock,
  input: DeleteNoteInput,
): Promise<UseCaseResult<void>> {
  const existingResult = fromReadResult(
    await readPageNote(db, input.savedPageId, input.noteId),
    'page-note',
  )
  if (!existingResult.ok) return existingResult

  // حذف ملاحظة تصرّف مقصود في محتوى المهمة — عمل عليها (0009).
  const written = await deletePageNote(db, input.savedPageId, input.noteId, {
    workedAt: clock.now(),
  })
  if (!written.ok) return { ok: false, error: fromStorageFailure(written) }

  return { ok: true, value: undefined }
}

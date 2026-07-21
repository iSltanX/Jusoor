/**
 * طبقة التركيب للعمل **داخل** المساحات: الدليل، وفتح مساحة، وتحرير بياناتها،
 * وإدارة صفحاتها وملاحظاتها.
 *
 * تكمّل `workspace-creation.ts` المخصص لمسار «إنشاء مساحة من التبويبات» وحده.
 * كلاهما يعرض للواجهة دوالَّ بلا وسائط بنيوية — لا `IDBDatabase` ولا `Clock`
 * ولا `IdGenerator` تعبر إلى React، ولا تعرف `ui` شيئًا عن `storage`.
 *
 * كل عطل تشغيلي يُلتقط هنا ويتحول إلى `UseCaseResult` منظم.
 */

import type { UseCaseResult } from './errors'
import { randomIdGenerator, systemClock, toUnexpected, withDatabase } from './runtime'
import {
  createWorkspace,
  readWorkspaceView,
  updateCheckpoint,
  updateWorkspace,
  type CreateWorkspaceInput,
  type UpdateCheckpointInput,
  type UpdateWorkspaceInput,
  type WorkspaceView,
  deleteWorkspaceEntirely,
  type DeleteWorkspaceOutcome,
} from './workspaces'
import {
  addPage,
  reorderPages,
  updatePage,
  type AddPageInput,
  type AddPageOutcome,
  type ReorderEntry,
  type UpdatePageInput,
  removePage,
} from './pages'
import { addNote, deleteNote, updateNote } from './notes'
import { inspectCurrentPage, type CurrentPageDraft } from './current-page'
import {
  freezeWorkspace,
  readReturnSummary,
  restoreWorkspacePages,
  type FreezeWorkspaceOutcome,
  type FreezeWorkspaceRequest,
  type PageOpenResult,
  type RestoreWorkspaceOutcome,
  type RestoreWorkspaceRequest,
  type ReturnSummary,
} from './workspace-lifecycle'
import { hasTabsPermission } from './permissions'
import { closeTabs, openTab, readActiveTab, readCurrentWindowTabs } from '../browser/tabs'
import { countPagesByWorkspace } from '../storage/pages'
import { listWorkspaces } from '../storage/workspaces'
import { patchSettings, readSettings, writeSettings } from '../storage/settings'
import type { PageNoteId, SavedPageId, WorkspaceId } from '../core/ids'
import { asWorkspaceId } from '../core/ids'
import type { PageNote, SavedPage } from '../core/page'
import type { Workspace } from '../core/workspace'



// ===== دليل المساحات =====

/** مساحة مع ما تحتاجه بطاقتها — عدد الصفحات وحده مشتق، والباقي من السجل. */
export interface WorkspaceSummary {
  workspace: Workspace
  pageCount: number
}

export interface WorkspaceDirectory {
  /** مرتبة بالأحدث عملًا أولًا — توجّه المستخدم إلى ما يحتاج استكماله (§10.1). */
  summaries: WorkspaceSummary[]
  corruptedCount: number
  /** آخر مساحة عمل عليها المستخدم، إن كانت ما تزال موجودة. */
  lastWorkspaceId?: WorkspaceId
  /**
   * لحظة القراءة من الساعة المحقونة — أساس صياغة «منذ متى» في العرض.
   *
   * تُقرأ هنا لا في المكوّن: قراءة الوقت أثناء التصيير دالة غير خالصة تعطي
   * نتيجة مختلفة كلما أُعيد التصيير بلا سبب.
   */
  loadedAt: number
}

/** الأحدث عملًا أولًا، ثم الأحدث إنشاءً، ثم المعرّف حسمًا نهائيًا مضمونًا. */
function compareByRecentWork(a: WorkspaceSummary, b: WorkspaceSummary): number {
  const left = a.workspace
  const right = b.workspace

  if (left.lastWorkedAt !== right.lastWorkedAt) return right.lastWorkedAt - left.lastWorkedAt
  if (left.createdAt !== right.createdAt) return right.createdAt - left.createdAt
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0
}

export async function loadWorkspaceDirectory(): Promise<UseCaseResult<WorkspaceDirectory>> {
  return withDatabase(async (db) => {
    const listed = await listWorkspaces(db)
    const counts = await countPagesByWorkspace(
      db,
      listed.items.map((workspace) => workspace.id),
    )

    const summaries = listed.items
      .map((workspace) => ({ workspace, pageCount: counts.get(workspace.id) ?? 0 }))
      .sort(compareByRecentWork)

    const settings = await readSettings()
    const remembered = settings.lastWorkspaceId
    const stillExists =
      remembered !== undefined && listed.items.some((workspace) => workspace.id === remembered)

    return {
      ok: true,
      value: {
        summaries,
        corruptedCount: listed.corrupted.length,
        loadedAt: systemClock.now(),
        ...(stillExists && remembered !== undefined
          ? { lastWorkspaceId: asWorkspaceId(remembered) }
          : {}),
      },
    }
  })
}

/** يسجّل آخر مساحة عمل عليها المستخدم. فشله لا يُفشل العملية التي سبقته. */
export async function rememberLastWorkspace(id: WorkspaceId): Promise<void> {
  try {
    await patchSettings({ lastWorkspaceId: id })
  } catch {
    // تفضيل مساعد لا بيانات مستخدم: تعذّر حفظه لا يُبطل فتح المساحة نفسه.
  }
}

// ===== فتح مساحة =====

export async function openWorkspace(id: WorkspaceId): Promise<UseCaseResult<WorkspaceView>> {
  return withDatabase((db) => readWorkspaceView(db, id))
}

// ===== إنشاء وتحرير =====

export async function createEmptyWorkspace(
  input: CreateWorkspaceInput,
): Promise<UseCaseResult<Workspace>> {
  return withDatabase((db) => createWorkspace(db, systemClock, randomIdGenerator, input))
}

export async function saveWorkspaceFields(
  id: WorkspaceId,
  patch: UpdateWorkspaceInput,
): Promise<UseCaseResult<Workspace>> {
  return withDatabase((db) => updateWorkspace(db, systemClock, id, patch))
}

export async function saveCheckpoint(
  id: WorkspaceId,
  input: UpdateCheckpointInput,
): Promise<UseCaseResult<Workspace>> {
  return withDatabase((db) => updateCheckpoint(db, systemClock, id, input))
}

// ===== الصفحات =====

export async function savePageToWorkspace(
  input: AddPageInput,
): Promise<UseCaseResult<AddPageOutcome>> {
  return withDatabase((db) => addPage(db, systemClock, randomIdGenerator, input))
}

export async function savePageFields(
  id: SavedPageId,
  patch: UpdatePageInput,
): Promise<UseCaseResult<SavedPage>> {
  return withDatabase((db) => updatePage(db, systemClock, id, patch))
}

export async function savePageOrder(
  workspaceId: WorkspaceId,
  entries: readonly ReorderEntry[],
): Promise<UseCaseResult<SavedPage[]>> {
  return withDatabase((db) => reorderPages(db, systemClock, workspaceId, entries))
}

/**
 * يقرأ الصفحة المفتوحة الآن. **لا يطلب أي صلاحية**: يحاول `activeTab` القائمة،
 * وتعذّرها يعود خطأً مفصَّلًا تقرر الواجهة عنده عرض طلب `tabs` — قرار 0012.
 */
export async function inspectCurrentTab(): Promise<UseCaseResult<CurrentPageDraft>> {
  try {
    return await inspectCurrentPage(readActiveTab)
  } catch (error: unknown) {
    return { ok: false, error: toUnexpected(error) }
  }
}

// ===== الملاحظات =====

export async function savePageNote(
  savedPageId: SavedPageId,
  body: string,
): Promise<UseCaseResult<PageNote>> {
  return withDatabase((db) =>
    addNote(db, systemClock, randomIdGenerator, { savedPageId, body }),
  )
}

export async function editPageNote(
  savedPageId: SavedPageId,
  noteId: PageNoteId,
  body: string,
): Promise<UseCaseResult<PageNote>> {
  return withDatabase((db) => updateNote(db, systemClock, { savedPageId, noteId, body }))
}

export async function removePageNote(
  savedPageId: SavedPageId,
  noteId: PageNoteId,
): Promise<UseCaseResult<void>> {
  return withDatabase((db) => deleteNote(db, systemClock, { savedPageId, noteId }))
}

// ===== التجميد والعودة =====

/**
 * يجمّد المساحة، ومعها إغلاق تبويباتها إن طلبه المستخدم صراحةً.
 *
 * دوال المتصفح تُحقن هنا لا داخل حالة الاستخدام، فتبقى الأخيرة قابلة للاختبار
 * دون `chrome` — و`chrome.*` محصورًا في `src/browser/`.
 */
export async function freezeWorkspaceNow(
  input: FreezeWorkspaceRequest,
): Promise<UseCaseResult<FreezeWorkspaceOutcome>> {
  return withDatabase((db) =>
    freezeWorkspace(
      db,
      systemClock,
      { readCurrentWindowTabs, closeTabs, hasTabsPermission },
      input,
    ),
  )
}

/** يقرأ ما تحتاجه شاشة العودة — قراءة خالصة لا تفتح تبويبًا ولا تغيّر حالة. */
export async function loadReturnSummary(
  workspaceId: WorkspaceId,
): Promise<UseCaseResult<ReturnSummary>> {
  return withDatabase((db) => readReturnSummary(db, systemClock, workspaceId))
}

/** يعيد المساحة إلى النشاط ويفتح الصفحات المختارة وحدها. */
export async function restoreWorkspace(
  input: RestoreWorkspaceRequest,
): Promise<UseCaseResult<RestoreWorkspaceOutcome>> {
  return withDatabase((db) => restoreWorkspacePages(db, systemClock, openTab, input))
}

export type {
  CurrentPageDraft,
  FreezeWorkspaceOutcome,
  FreezeWorkspaceRequest,
  PageOpenResult,
  RestoreWorkspaceOutcome,
  ReturnSummary,
  WorkspaceView,
}

// ===== الحذف النهائي — قرار 0018 =====

/** يحذف صفحة من مساحتها نهائيًا بعد تأكيد الواجهة التدميري. */
export async function removePageFromWorkspace(
  pageId: SavedPageId,
): Promise<UseCaseResult<void>> {
  return withDatabase((db) => removePage(db, systemClock, { pageId }))
}

/**
 * يحذف المساحة كاملة نهائيًا بعد تأكيد الواجهة التدميري، ثم ينظف مؤشر
 * «آخر مساحة مستخدمة» إن كان يشير إليها — المؤشر يسكن `chrome.storage.local`
 * خارج معاملة القاعدة، وتنظيفه أثر لاحق لنجاح الحذف لا شرطًا له.
 */
export async function deleteWorkspaceNow(
  workspaceId: WorkspaceId,
): Promise<UseCaseResult<DeleteWorkspaceOutcome>> {
  const result = await withDatabase((db) => deleteWorkspaceEntirely(db, { workspaceId }))
  if (!result.ok) return result

  const settings = await readSettings()
  if (settings.lastWorkspaceId === workspaceId) {
    const { lastWorkspaceId: _dropped, ...rest } = settings
    void _dropped
    await writeSettings(rest)
  }

  return result
}

/**
 * التصدير والاستيراد — دستور المنتج §9.9 و§9.10.
 *
 * التقسيم مقصود: `storage/transfer.ts` يملك المخطط والتحقق والكتابة الذرّية،
 * وهذا الملف يملك **قرار التعارض** وحده — أي ما لا يستطيع التخزين حسمه لأنه
 * اختيار مستخدم لا قاعدة بيانات (§9.10).
 *
 * لا شيء هنا يكتب قبل اكتمال التحقق: `inspectImport` قراءة خالصة تُنتج معاينة
 * وقائمة تعارضات، و`applyImport` وحدها تكتب — وبمعاملة واحدة.
 */

import type { IdGenerator } from './ids'
import type { ApplicationErrorCode, UseCaseResult } from './errors'
import { fromReadResult, fromStorageFailure } from './errors'
import { getDatabase, randomIdGenerator, systemClock, toUnexpected, withDatabase } from './runtime'
import { listPagesByWorkspace } from '../storage/pages'
import { listWorkspaces, readWorkspace } from '../storage/workspaces'
import {
  parseTransfer,
  serializeTransfer,
  writeImportedWorkspaces,
  type ImportEntry,
  type TransferEnvelope,
  type TransferRejection,
  type TransferWorkspace,
} from '../storage/transfer'
import type { SavedPageId, WorkspaceId } from '../core/ids'
import type { SavedPage } from '../core/page'
import type { Workspace } from '../core/workspace'
import { normalizeUrlForComparison } from '../core/url'



// ===== التصدير =====

/** يجمع مساحة مع صفحاتها بالشكل الذي يكتبه الملف. */
async function collect(db: IDBDatabase, id: WorkspaceId): Promise<UseCaseResult<TransferWorkspace>> {
  const workspaceResult = fromReadResult(await readWorkspace(db, id), 'workspace')
  if (!workspaceResult.ok) return workspaceResult

  const listed = await listPagesByWorkspace(db, id)

  return { ok: true, value: { workspace: workspaceResult.value, pages: listed.items } }
}

export interface ExportResult {
  json: string
  workspaces: number
  pages: number
}

function toExportResult(entries: readonly TransferWorkspace[], exportedAt: number): ExportResult {
  return {
    json: serializeTransfer(entries, exportedAt),
    workspaces: entries.length,
    pages: entries.reduce((total, entry) => total + entry.pages.length, 0),
  }
}

/** يصدّر مساحة واحدة — §9.10. */
export async function exportWorkspace(id: WorkspaceId): Promise<UseCaseResult<ExportResult>> {
  return withDatabase(async (db) => {
    const collected = await collect(db, id)
    if (!collected.ok) return collected

    return { ok: true, value: toExportResult([collected.value], systemClock.now()) }
  })
}

/**
 * يصدّر كل المساحات — نسخة احتياطية كاملة (§9.10).
 *
 * السجلات التالفة لا تدخل الملف (لا تُقرأ أصلًا)، وعددها يُعاد صراحةً فلا
 * يظن المستخدم أن نسخته الاحتياطية شاملة وهي ناقصة.
 */
export interface FullExportResult extends ExportResult {
  corruptedSkipped: number
}

export async function exportAllWorkspaces(): Promise<UseCaseResult<FullExportResult>> {
  return withDatabase(async (db) => {
    const listed = await listWorkspaces(db)
    const entries: TransferWorkspace[] = []

    for (const workspace of listed.items) {
      const pages = await listPagesByWorkspace(db, workspace.id)
      entries.push({ workspace, pages: pages.items })
    }

    const base = toExportResult(entries, systemClock.now())

    return { ok: true, value: { ...base, corruptedSkipped: listed.corrupted.length } }
  })
}

// ===== الاستيراد: المعاينة وكشف التعارض =====

/**
 * تعارض بين مساحة واردة وأخرى قائمة — §9.10 يذكر «تعارض الاسم أو البيانات».
 *
 * المعرّف يقابل «تعارض البيانات» (السجل نفسه عائدًا)، والاسم يقابل «تعارض
 * الاسم» (مساحة أخرى تحمل الاسم ذاته). كلاهما يستوجب قرار المستخدم.
 */
export interface ImportConflict {
  incomingIndex: number
  incomingName: string
  existingId: WorkspaceId
  existingName: string
  matchedBy: 'id' | 'name'
}

export interface ImportPreview {
  envelope: TransferEnvelope
  workspaces: number
  pages: number
  conflicts: ImportConflict[]
}

export type InspectImportResult =
  | { ok: true; value: ImportPreview }
  | { ok: false; rejection: TransferRejection }
  | { ok: false; error: ApplicationErrorCode }

/** يطابق مساحة واردة بمساحة قائمة: بالمعرّف أولًا، ثم بالاسم بعد trim. */
function findConflict(
  incoming: Workspace,
  existing: readonly Workspace[],
): { workspace: Workspace; matchedBy: 'id' | 'name' } | undefined {
  const byId = existing.find((candidate) => candidate.id === incoming.id)
  if (byId !== undefined) return { workspace: byId, matchedBy: 'id' }

  const name = incoming.name.trim()
  const byName = existing.find((candidate) => candidate.name.trim() === name)
  if (byName !== undefined) return { workspace: byName, matchedBy: 'name' }

  return undefined
}

/**
 * يقرأ ملفًا ويتحقق منه ويكشف تعارضاته — **بلا أي كتابة**.
 *
 * هذه هي الخطوة التي تجعل «الاستيراد لا يكتب شيئًا قبل اكتمال التحقق» قابلًا
 * للإثبات: لا مسار يصل إلى التخزين من هنا إلا القراءة.
 */
export async function inspectImport(raw: string): Promise<InspectImportResult> {
  const parsed = parseTransfer(raw)
  if (!parsed.ok) return { ok: false, rejection: parsed.rejection }

  try {
    const db = await getDatabase()
    const existing = await listWorkspaces(db)

    const conflicts: ImportConflict[] = []

    parsed.value.workspaces.forEach((entry, incomingIndex) => {
      const match = findConflict(entry.workspace, existing.items)
      if (match === undefined) return

      conflicts.push({
        incomingIndex,
        incomingName: entry.workspace.name,
        existingId: match.workspace.id,
        existingName: match.workspace.name,
        matchedBy: match.matchedBy,
      })
    })

    return {
      ok: true,
      value: {
        envelope: parsed.value,
        workspaces: parsed.value.workspaces.length,
        pages: parsed.value.workspaces.reduce((total, entry) => total + entry.pages.length, 0),
        conflicts,
      },
    }
  } catch (error: unknown) {
    return { ok: false, error: toUnexpected(error) }
  }
}

// ===== الاستيراد: القرار والتطبيق =====

/** الخيارات الأربعة المنصوص عليها في §9.10 — لا ثالث لها ولا افتراضي صامت. */
export const IMPORT_RESOLUTIONS = ['create-copy', 'replace', 'merge-pages', 'cancel'] as const
export type ImportResolution = (typeof IMPORT_RESOLUTIONS)[number]

/**
 * يعيد بناء صفحات مساحة بمعرفات جديدة تحت مساحة هدف.
 *
 * **معرفات الصفحات تُولَّد دائمًا عند الاستيراد** ولا تُؤخذ من الملف: مخزن
 * الصفحات مفتاحه `id` عالميًا، ومعرّف وارد قد يطابق صفحة تخص **مساحة أخرى**
 * تمامًا، فتستبدلها `put` صامتًا — فقدان بيانات لا يراه أحد. التوليد يمنع ذلك
 * بنيويًا بدل فحصٍ قد يُنسى. والمعرّف قيمة داخلية لا يراها المستخدم، فلا شيء
 * من محتواه يُفقد بتغييره.
 */
function rehomePages(
  pages: readonly SavedPage[],
  workspaceId: WorkspaceId,
  ids: IdGenerator,
): { pages: SavedPage[]; idMap: Map<SavedPageId, SavedPageId> } {
  const idMap = new Map<SavedPageId, SavedPageId>()

  const rebuilt = pages.map((page) => {
    const id = ids.savedPageId()
    idMap.set(page.id, id)
    return { ...page, id, workspaceId }
  })

  return { pages: rebuilt, idMap }
}

/** يعيد ربط التبويب النشط بمعرّفه الجديد، أو يسقطه إن لم تُستورد صفحته. */
function remapActivePage(
  workspace: Workspace,
  idMap: Map<SavedPageId, SavedPageId>,
): Workspace {
  const next = { ...workspace }
  const mapped =
    workspace.activePageId === undefined ? undefined : idMap.get(workspace.activePageId)

  if (mapped !== undefined) next.activePageId = mapped
  else delete next.activePageId

  return next
}

export interface ApplyImportInput {
  envelope: TransferEnvelope
  /** يُطبَّق على المساحات المتعارضة كلها؛ غير المتعارضة تُستورد كما هي. */
  resolution: ImportResolution
}

export interface ApplyImportOutcome {
  imported: number
  pagesImported: number
  /** مساحات تخطّاها القرار (الإلغاء، أو دمج بلا صفحة جديدة واحدة). */
  skipped: number
}

/**
 * يبني دفعة الاستيراد ثم يكتبها ذرّيًا.
 *
 * الدلالات الأربع (§9.10):
 * - **إنشاء نسخة:** مساحة جديدة بمعرّف جديد، والقائمة لا تُمس إطلاقًا.
 * - **الاستبدال:** المساحة القائمة تأخذ بيانات الواردة، وصفحاتها القديمة تُحذف
 *   قبل كتابة الواردة — وإلا اختلط قديم بجديد في مساحة يظنها المستخدم مستبدَلة.
 * - **دمج الصفحات غير المكررة:** سجل المساحة القائمة **لا يتغير إطلاقًا**؛
 *   §9.10 يقول «دمج الصفحات» لا دمج الحقول، فاسم المساحة وهدفها ونقطة توقفها
 *   تبقى كما هي. وتُضاف الصفحات التي لا يطابق رابطها المطبَّع صفحةً قائمة.
 * - **الإلغاء:** لا يُكتب شيء لأي مساحة متعارضة.
 */
export async function applyImport(
  input: ApplyImportInput,
): Promise<UseCaseResult<ApplyImportOutcome>> {
  return withDatabase((db) => planAndWriteImport(db, randomIdGenerator, input))
}

/**
 * لا `Clock` هنا عمدًا: تواريخ المساحة الواردة (`createdAt`، `lastWorkedAt`)
 * بيانات المستخدم لا آثار كتابة، واستبدالها بوقت الاستيراد كان سيمحو متى أنشأ
 * المهمة ومتى عمل عليها آخر مرة — وهو ما يجعل استعادة نسخة احتياطية كاذبة.
 */
export async function planAndWriteImport(
  db: IDBDatabase,
  ids: IdGenerator,
  input: ApplyImportInput,
): Promise<UseCaseResult<ApplyImportOutcome>> {
  const existing = await listWorkspaces(db)
  const entries: ImportEntry[] = []
  let skipped = 0

  for (const incoming of input.envelope.workspaces) {
    const match = findConflict(incoming.workspace, existing.items)

    // لا تعارض: تُستورد كما هي بمعرّف مساحتها الوارد.
    if (match === undefined) {
      const { pages, idMap } = rehomePages(incoming.pages, incoming.workspace.id, ids)
      entries.push({
        workspace: remapActivePage(incoming.workspace, idMap),
        pages,
        replaceExistingPages: false,
      })
      continue
    }

    if (input.resolution === 'cancel') {
      skipped += 1
      continue
    }

    if (input.resolution === 'create-copy') {
      const workspaceId = ids.workspaceId()
      const { pages, idMap } = rehomePages(incoming.pages, workspaceId, ids)
      entries.push({
        workspace: { ...remapActivePage(incoming.workspace, idMap), id: workspaceId },
        pages,
        replaceExistingPages: false,
      })
      continue
    }

    if (input.resolution === 'replace') {
      const workspaceId = match.workspace.id
      const { pages, idMap } = rehomePages(incoming.pages, workspaceId, ids)
      entries.push({
        workspace: { ...remapActivePage(incoming.workspace, idMap), id: workspaceId },
        pages,
        replaceExistingPages: true,
      })
      continue
    }

    // دمج الصفحات غير المكررة
    const workspaceId = match.workspace.id
    const current = await listPagesByWorkspace(db, workspaceId)
    const known = new Set(current.items.map((page) => normalizeUrlForComparison(page.url)))

    const fresh = incoming.pages.filter(
      (page) => !known.has(normalizeUrlForComparison(page.url)),
    )

    if (fresh.length === 0) {
      skipped += 1
      continue
    }

    const { pages } = rehomePages(fresh, workspaceId, ids)

    entries.push({
      // سجل المساحة القائمة كما هو — الدمج يخص الصفحات وحدها.
      workspace: match.workspace,
      pages,
      replaceExistingPages: false,
    })
  }

  if (entries.length === 0) {
    return { ok: true, value: { imported: 0, pagesImported: 0, skipped } }
  }

  const written = await writeImportedWorkspaces(db, entries)
  if (!written.ok) return { ok: false, error: fromStorageFailure(written) }

  return {
    ok: true,
    value: {
      imported: entries.length,
      pagesImported: entries.reduce((total, entry) => total + entry.pages.length, 0),
      skipped,
    },
  }
}

export type { TransferEnvelope, TransferRejection }

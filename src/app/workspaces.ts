/**
 * حالات الاستخدام الأساسية لمساحة العمل: إنشاء، قراءة، تحديث، تجميد منطقي،
 * وإعادة تنشيط منطقية. تربط قواعد core/ بعقود storage/، دون أي واجهة أو
 * واجهة متصفح.
 */

import type { Clock } from './clock'
import type { IdGenerator } from './ids'
import { fromReadResult, fromStorageFailure, type UseCaseResult } from './errors'
import type { CorruptRecordInfo } from '../storage/errors'
import { listPagesByWorkspace } from '../storage/pages'
import { readWorkspace, writeWorkspace,
  deleteWorkspaceWithPages,
} from '../storage/workspaces'
import type { WorkspaceId } from '../core/ids'
import type { SavedPage } from '../core/page'
import type { Workspace } from '../core/workspace'
import { transitionWorkspaceStatus } from '../core/workspace'
import type { WorkspaceTemplate } from '../core/enums'
import { DEFAULT_WORKSPACE_STATUS, DEFAULT_WORKSPACE_TEMPLATE } from '../core/enums'
import { isValidWorkspaceName, normalizeOptionalText } from '../core/validation'

// ===== إنشاء مساحة عمل فارغة =====

export interface CreateWorkspaceInput {
  name: string
  goal?: string
  description?: string
  template?: WorkspaceTemplate
}

/**
 * ينشئ مساحة عمل فارغة. الاسم وحده إلزامي — دستور المنتج §8.3: "لا يُجبر على
 * تعبئة بقية الحقول". لا تُنشأ صفحات أو تبويبات معها بأي حال.
 */
export async function createWorkspace(
  db: IDBDatabase,
  clock: Clock,
  ids: IdGenerator,
  input: CreateWorkspaceInput,
): Promise<UseCaseResult<Workspace>> {
  const name = input.name.trim()
  if (!isValidWorkspaceName(name)) {
    return { ok: false, error: { kind: 'invalid-input', field: 'name' } }
  }

  const now = clock.now()
  const goal = normalizeOptionalText(input.goal)
  const description = normalizeOptionalText(input.description)

  const workspace: Workspace = {
    id: ids.workspaceId(),
    name,
    template: input.template ?? DEFAULT_WORKSPACE_TEMPLATE,
    status: DEFAULT_WORKSPACE_STATUS,
    createdAt: now,
    updatedAt: now,
    lastWorkedAt: now,
    ...(goal !== undefined ? { goal } : {}),
    ...(description !== undefined ? { description } : {}),
  }

  const written = await writeWorkspace(db, workspace)
  if (!written.ok) return { ok: false, error: fromStorageFailure(written) }

  return { ok: true, value: workspace }
}

// ===== قراءة مساحة عمل =====

/**
 * عرض مساحة عمل مع صفحاتها بالترتيب المعتمد. الملاحظات مضمَّنة أصلًا داخل كل
 * صفحة (لا كيان مستقل)، فتصل معها دون استعلام إضافي. هذا عرض بيانات خام، لا
 * ViewModel بصري ولا نصوص واجهة أو ترجمات.
 */
export interface WorkspaceView {
  workspace: Workspace
  pages: SavedPage[]
  /** صفحات تالفة اكتُشفت أثناء القراءة — لا تختفي صامتة، ولا تظهر في pages. */
  corruptedPages: CorruptRecordInfo[]
}

export async function readWorkspaceView(
  db: IDBDatabase,
  id: WorkspaceId,
): Promise<UseCaseResult<WorkspaceView>> {
  const workspaceResult = fromReadResult(await readWorkspace(db, id), 'workspace')
  if (!workspaceResult.ok) return workspaceResult

  const pagesResult = await listPagesByWorkspace(db, id)

  return {
    ok: true,
    value: {
      workspace: workspaceResult.value,
      pages: pagesResult.items,
      corruptedPages: pagesResult.corrupted,
    },
  }
}

// ===== تحديث بيانات مساحة العمل =====

export interface UpdateWorkspaceInput {
  name?: string
  goal?: string
  description?: string
  generalNote?: string
}

/**
 * يحدّث حقول ملف المساحة النصية. لا يسمح بتغيير id (غير موجود في المدخل
 * أصلًا)، ولا يمس status — تغيير الحالة حصرًا عبر freezeWorkspaceState/
 * reactivateWorkspace اللذين يمرّان بقواعد الانتقال في core/؛ فتح status هنا
 * كان سيتجاوز تلك القواعد. لا كتابة إن لم يتغيّر شيء فعليًا.
 *
 * **`lastWorkedAt` لا يرتفع بتحرير الاسم أو الهدف أو الوصف**: قرار 0009 يحصر
 * رفعه في العمل المقصود على المهمة (صفحة، ملاحظة، نقطة توقف، تجميد، استعادة)،
 * وتسمية المهمة أو إعادة صياغة هدفها ضبطُ إطارها لا عملٌ فيها. أما
 * `generalNote` فهي **ملاحظة** بنص دستور المنتج §7.6، فترفعه.
 */
export async function updateWorkspace(
  db: IDBDatabase,
  clock: Clock,
  id: WorkspaceId,
  patch: UpdateWorkspaceInput,
): Promise<UseCaseResult<Workspace>> {
  const current = fromReadResult(await readWorkspace(db, id), 'workspace')
  if (!current.ok) return current
  const existing = current.value

  let name = existing.name
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim()
    if (!isValidWorkspaceName(trimmed)) {
      return { ok: false, error: { kind: 'invalid-input', field: 'name' } }
    }
    name = trimmed
  }

  const goal = patch.goal !== undefined ? normalizeOptionalText(patch.goal) : existing.goal
  const description =
    patch.description !== undefined ? normalizeOptionalText(patch.description) : existing.description
  const generalNote =
    patch.generalNote !== undefined ? normalizeOptionalText(patch.generalNote) : existing.generalNote

  const generalNoteChanged = generalNote !== existing.generalNote

  const changed =
    name !== existing.name ||
    goal !== existing.goal ||
    description !== existing.description ||
    generalNoteChanged

  if (!changed) return { ok: true, value: existing }

  const now = clock.now()
  const updated: Workspace = {
    ...existing,
    name,
    updatedAt: now,
    ...(generalNoteChanged ? { lastWorkedAt: now } : {}),
  }

  if (goal !== undefined) updated.goal = goal
  else delete updated.goal

  if (description !== undefined) updated.description = description
  else delete updated.description

  if (generalNote !== undefined) updated.generalNote = generalNote
  else delete updated.generalNote

  const written = await writeWorkspace(db, updated)
  if (!written.ok) return { ok: false, error: fromStorageFailure(written) }

  return { ok: true, value: updated }
}

// ===== تحديث نقطة التوقف والخطوة التالية =====

export interface UpdateCheckpointInput {
  lastReached?: string
  nextStep?: string
}

/**
 * يحفظ "آخر ما وصلت إليه" و"الخطوة التالية" — دستور المنتج §7.4 و§7.5.
 * كلاهما اختياري، ولا يُشترط التجميد لتحديثهما. لا قص للنص ولا إعادة صياغة
 * ولا تحليل لمعناه: يُحفظ حرفيًا (بعد trim فقط، عبر normalizeOptionalText
 * الموجودة أصلًا في core/، لا منطق جديد).
 */
export async function updateCheckpoint(
  db: IDBDatabase,
  clock: Clock,
  id: WorkspaceId,
  input: UpdateCheckpointInput,
): Promise<UseCaseResult<Workspace>> {
  const current = fromReadResult(await readWorkspace(db, id), 'workspace')
  if (!current.ok) return current
  const existing = current.value

  const lastReached =
    input.lastReached !== undefined ? normalizeOptionalText(input.lastReached) : existing.lastReached
  const nextStep = input.nextStep !== undefined ? normalizeOptionalText(input.nextStep) : existing.nextStep

  const changed = lastReached !== existing.lastReached || nextStep !== existing.nextStep
  if (!changed) return { ok: true, value: existing }

  const now = clock.now()
  const updated: Workspace = { ...existing, updatedAt: now, lastWorkedAt: now }

  if (lastReached !== undefined) updated.lastReached = lastReached
  else delete updated.lastReached

  if (nextStep !== undefined) updated.nextStep = nextStep
  else delete updated.nextStep

  const written = await writeWorkspace(db, updated)
  if (!written.ok) return { ok: false, error: fromStorageFailure(written) }

  return { ok: true, value: updated }
}

// ===== تجميد الحالة المنطقية =====

export interface FreezeWorkspaceInput {
  lastReached?: string
  nextStep?: string
}

/**
 * الجزء المنطقي فقط من التجميد: تحديث الحالة إلى مجمدة عبر قواعد الانتقال في
 * core/، وحفظ نقطة التوقف والخطوة التالية إن أُرسلتا. لا تُغلق تبويبات، ولا
 * تُقرأ تبويبات المتصفح، ولا صلاحيات تُطلب، ولا chrome.tabs يُستدعى — إغلاق
 * التبويبات عملية منفصلة معماريًا تخص طبقة المتصفح لاحقًا.
 */
export async function freezeWorkspaceState(
  db: IDBDatabase,
  clock: Clock,
  id: WorkspaceId,
  input: FreezeWorkspaceInput = {},
): Promise<UseCaseResult<Workspace>> {
  const current = fromReadResult(await readWorkspace(db, id), 'workspace')
  if (!current.ok) return current

  const now = clock.now()
  const transition = transitionWorkspaceStatus(current.value, 'freeze', now)
  if (!transition.ok) return { ok: false, error: { kind: 'domain', code: transition.error } }

  const frozen: Workspace = { ...transition.value }

  const lastReached =
    input.lastReached !== undefined ? normalizeOptionalText(input.lastReached) : frozen.lastReached
  const nextStep = input.nextStep !== undefined ? normalizeOptionalText(input.nextStep) : frozen.nextStep

  if (lastReached !== undefined) frozen.lastReached = lastReached
  else delete frozen.lastReached

  if (nextStep !== undefined) frozen.nextStep = nextStep
  else delete frozen.nextStep

  const written = await writeWorkspace(db, frozen)
  if (!written.ok) return { ok: false, error: fromStorageFailure(written) }

  return { ok: true, value: frozen }
}

// ===== إعادة تنشيط مساحة =====

/**
 * التغيير المنطقي من مجمدة إلى نشطة عند بدء العودة. لا تُفتح صفحات، ولا
 * تُسجَّل نتيجة استعادة — الاستعادة الفعلية لم تحدث بعد، وتسجيل نجاحها الآن
 * كان سيخالف مبدأ الاستعادة الصادقة (دستور المنتج §6.6).
 */
export async function reactivateWorkspace(
  db: IDBDatabase,
  clock: Clock,
  id: WorkspaceId,
): Promise<UseCaseResult<Workspace>> {
  const current = fromReadResult(await readWorkspace(db, id), 'workspace')
  if (!current.ok) return current

  const now = clock.now()
  const transition = transitionWorkspaceStatus(current.value, 'resume', now)
  if (!transition.ok) return { ok: false, error: { kind: 'domain', code: transition.error } }

  const written = await writeWorkspace(db, transition.value)
  if (!written.ok) return { ok: false, error: fromStorageFailure(written) }

  return { ok: true, value: transition.value }
}

// ===== حذف مساحة كاملة — قرار 0018 =====

export interface DeleteWorkspaceOutcome {
  /** عدد الصفحات المحذوفة مع المساحة — لصياغة نتيجة صادقة إن لزمت. */
  deletedPages: number
}

/**
 * يحذف المساحة وكل صفحاتها وملاحظاتها حذفًا نهائيًا مؤكدًا (قرار 0018).
 * التأكيد التدميري بأعداد حقيقية مسؤولية الواجهة قبل الاستدعاء، ولا سلة
 * محذوفات ولا تراجع في V1. الذرية كلها في طبقة التخزين.
 */
export async function deleteWorkspaceEntirely(
  db: IDBDatabase,
  input: { workspaceId: WorkspaceId },
): Promise<UseCaseResult<DeleteWorkspaceOutcome>> {
  const deleted = await deleteWorkspaceWithPages(db, input.workspaceId)
  if (!deleted.ok) return { ok: false, error: fromStorageFailure(deleted) }

  return { ok: true, value: { deletedPages: deleted.value.deletedPages } }
}

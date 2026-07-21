/**
 * دورة المساحة الفعلية: التجميد (مع إغلاق تبويباتها اختياريًا) والعودة (مع فتح
 * صفحاتها). هنا يلتقي المنطق المحفوظ بأثر حقيقي على المتصفح — قرار 0013.
 *
 * دوال المتصفح **محقونة** لا مستوردة داخل الدوال، فتُختبر هذه الحالات بقيم
 * ثابتة دون `chrome` حقيقي، ويبقى `chrome.*` محصورًا في `src/browser/`.
 */

import type { Clock } from './clock'
import { fromReadResult, fromStorageFailure, type UseCaseResult } from './errors'
import { freezeWorkspaceState, readWorkspaceView } from './workspaces'
import type { CloseTabsOutcome, OpenTabOutcome, ReadWindowTabsResult } from '../browser/tabs'
import { listPagesByWorkspace } from '../storage/pages'
import { readWorkspace, writeWorkspace } from '../storage/workspaces'
import type { SavedPageId, WorkspaceId } from '../core/ids'
import type { SavedPage } from '../core/page'
import type { Workspace } from '../core/workspace'
import { transitionWorkspaceStatus } from '../core/workspace'
import type { TabOpeningStatus } from '../core/enums'
import { classifyPageUrl, type PageLinkKind } from '../core/page-link'
import { normalizeUrlForComparison } from '../core/url'

// ===== التجميد =====

export interface FreezeWorkspaceRequest {
  workspaceId: WorkspaceId
  lastReached?: string
  nextStep?: string
  /** إغلاق تبويبات المساحة المفتوحة — فعل مدمر لا يقع إلا بطلب صريح. */
  closeOpenTabs: boolean
}

export interface FreezeWorkspaceOutcome {
  workspace: Workspace
  /** عدد التبويبات المغلقة فعلًا. صفر حين لم يُطلب الإغلاق أو لم يُطابَق شيء. */
  closedTabs: number
  /**
   * طُلب الإغلاق لكن تعذّر تمييز تبويبات المساحة لغياب صلاحية `tabs`.
   * التجميد نفسه تم — الحالة محفوظة، والإغلاق وحده لم يقع.
   */
  needsTabsPermission: boolean
  /** تعذّر الإغلاق لعطل في واجهة المتصفح، بعد نجاح التجميد. */
  closeFailed: boolean
}

/**
 * يجمّد المساحة، ثم يغلق تبويباتها إن طُلب ذلك صراحةً.
 *
 * الترتيب مقصود (0013): الحالة تُحفظ **قبل** لمس أي تبويب، فإن تعذّر الإغلاق
 * بقيت البيانات محفوظة ويُبلَّغ بالفارق بدل ادعاء نجاح كامل.
 */
export async function freezeWorkspace(
  db: IDBDatabase,
  clock: Clock,
  browser: {
    readCurrentWindowTabs: () => Promise<ReadWindowTabsResult>
    closeTabs: (tabIds: readonly number[]) => Promise<CloseTabsOutcome>
    hasTabsPermission: () => Promise<boolean>
  },
  input: FreezeWorkspaceRequest,
): Promise<UseCaseResult<FreezeWorkspaceOutcome>> {
  const frozen = await freezeWorkspaceState(db, clock, input.workspaceId, {
    ...(input.lastReached !== undefined ? { lastReached: input.lastReached } : {}),
    ...(input.nextStep !== undefined ? { nextStep: input.nextStep } : {}),
  })
  if (!frozen.ok) return frozen

  const base = { workspace: frozen.value, closedTabs: 0, needsTabsPermission: false, closeFailed: false }

  if (!input.closeOpenTabs) return { ok: true, value: base }

  // تمييز تبويبات المساحة يتطلب قراءة روابطها — وهذا ما يحتاج `tabs` (0013).
  if (!(await browser.hasTabsPermission())) {
    return { ok: true, value: { ...base, needsTabsPermission: true } }
  }

  const pages = await listPagesByWorkspace(db, input.workspaceId)
  const saved = new Set(pages.items.map((page) => normalizeUrlForComparison(page.url)))

  const tabs = await browser.readCurrentWindowTabs()
  if (tabs.kind === 'api-error') return { ok: true, value: { ...base, closeFailed: true } }

  const targets = tabs.usable
    .filter((tab) => saved.has(normalizeUrlForComparison(tab.url)))
    .map((tab) => tab.tabId)
    .filter((tabId): tabId is number => tabId !== undefined)

  const closed = await browser.closeTabs(targets)
  if (closed.kind === 'api-error') return { ok: true, value: { ...base, closeFailed: true } }

  return { ok: true, value: { ...base, closedTabs: closed.count } }
}

// ===== العودة والاستعادة =====

export interface PageOpenResult {
  pageId: SavedPageId
  title: string
  status: TabOpeningStatus
  linkKind: PageLinkKind
  /** سبب رفض المتصفح، حين يكون معروفًا. لا يُعرض بوصفه نجاحًا جزئيًا. */
  message?: string
}

export interface RestoreWorkspaceOutcome {
  workspace: Workspace
  results: PageOpenResult[]
  openedCount: number
  unavailableCount: number
}

export interface RestoreWorkspaceRequest {
  workspaceId: WorkspaceId
  /** الصفحات التي اختارها المستخدم صراحةً — لا فتح تلقائي للكل. */
  pageIds: readonly SavedPageId[]
}

/** يعيد المساحة إلى النشاط: انتقال محكوم إن كانت مجمدة، وإلا رفع وقت العمل. */
async function beginReturn(
  db: IDBDatabase,
  clock: Clock,
  workspace: Workspace,
): Promise<UseCaseResult<Workspace>> {
  const now = clock.now()

  const next =
    workspace.status === 'frozen'
      ? transitionWorkspaceStatus(workspace, 'resume', now)
      : { ok: true as const, value: { ...workspace, updatedAt: now, lastWorkedAt: now } }

  if (!next.ok) return { ok: false, error: { kind: 'domain', code: next.error } }

  const written = await writeWorkspace(db, next.value)
  if (!written.ok) return { ok: false, error: fromStorageFailure(written) }

  return { ok: true, value: next.value }
}

/**
 * يفتح الصفحات المختارة ويعيد نتيجة كل واحدة بصدق.
 *
 * الفتح **بالتسلسل** لا بالتوازي حتى يصل الترتيب كما حُفظ (0013)، والتبويب
 * النشط هو ما يشير إليه `activePageId` إن كان ضمن المختار.
 *
 * النتيجة `TabOpeningStatus` لا `RestoreStatus`: فتح تبويب ليس استعادة موضع
 * قراءة، ولا موضع محفوظ أصلًا (0009). ولا تُخزَّن النتيجة — حالة جلسة فقط.
 */
export async function restoreWorkspacePages(
  db: IDBDatabase,
  clock: Clock,
  openTab: (url: string, options: { active: boolean }) => Promise<OpenTabOutcome>,
  input: RestoreWorkspaceRequest,
): Promise<UseCaseResult<RestoreWorkspaceOutcome>> {
  const current = fromReadResult(await readWorkspace(db, input.workspaceId), 'workspace')
  if (!current.ok) return current

  const listed = await listPagesByWorkspace(db, input.workspaceId)
  const selected = new Set(input.pageIds)
  const pages = listed.items.filter((page) => selected.has(page.id))

  const returned = await beginReturn(db, clock, current.value)
  if (!returned.ok) return returned

  const workspace = returned.value
  const results: PageOpenResult[] = []

  for (const page of pages) {
    const outcome = await openTab(page.url, { active: page.id === workspace.activePageId })

    results.push({
      pageId: page.id,
      title: page.title,
      status: outcome.kind === 'opened' ? 'opened' : 'unavailable',
      linkKind: classifyPageUrl(page.url),
      ...(outcome.kind === 'unavailable' && outcome.message !== undefined
        ? { message: outcome.message }
        : {}),
    })
  }

  return {
    ok: true,
    value: {
      workspace,
      results,
      openedCount: results.filter((result) => result.status === 'opened').length,
      unavailableCount: results.filter((result) => result.status === 'unavailable').length,
    },
  }
}

// ===== ملخص العودة (قراءة فقط) =====

export interface ReturnSummary {
  workspace: Workspace
  pages: SavedPage[]
  /** ما لم يكتمل بعد — «ما بقي» في شاشة العودة (§9.3 و§10.3). */
  remaining: SavedPage[]
  /** الصفحات الأساسية — «الصفحات المهمة» (§9.3). */
  important: SavedPage[]
  /** لحظة القراءة من الساعة المحقونة — أساس صياغة «آخر عمل» في العرض. */
  loadedAt: number
}

/** يقرأ ما تحتاجه شاشة العودة. قراءة خالصة: لا تفتح شيئًا ولا تغيّر حالة. */
export async function readReturnSummary(
  db: IDBDatabase,
  clock: Clock,
  workspaceId: WorkspaceId,
): Promise<UseCaseResult<ReturnSummary>> {
  const view = await readWorkspaceView(db, workspaceId)
  if (!view.ok) return view

  const { workspace, pages } = view.value

  return {
    ok: true,
    value: {
      workspace,
      pages,
      remaining: pages.filter((page) => page.progressStatus !== 'complete'),
      important: pages.filter((page) => page.role === 'primary'),
      loadedAt: clock.now(),
    },
  }
}

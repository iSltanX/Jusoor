/**
 * حالات استخدام الصفحة الحالية: معاينتها قبل الحفظ، وإضافتها إلى مساحة قائمة.
 *
 * لا تستورد chrome.* أو chrome.Tab هنا؛ قراءة التبويب النشط تصل عبر دالة
 * مُحقَنة (readActiveTab)، تمامًا كما Clock وIdGenerator يُحقنان — فيبقى هذا
 * الملف قابلًا للاختبار بقيم ثابتة دون chrome حقيقي.
 */

import type { Clock } from './clock'
import type { IdGenerator } from './ids'
import type { ApplicationErrorCode, UseCaseResult } from './errors'
import { addPage, type AddPageInput, type AddPageOutcome } from './pages'
import type { ReadActiveTabResult } from '../browser/tabs'
import type { PageLinkKind } from '../core/page-link'
import type { PageProgressStatus, PageRole } from '../core/enums'
import type { WorkspaceId } from '../core/ids'

/**
 * يحوّل تعذّر الالتقاط إلى خطأ تطبيق **محتفظًا بسببه المفصَّل**: غياب الرابط
 * غير غياب العنوان، والفرق يغيّر ما تعرضه الواجهة وما تقترحه من مخرج.
 */
function toBrowserCaptureError(
  result: Exclude<ReadActiveTabResult, { kind: 'captured' }>,
): ApplicationErrorCode {
  return {
    kind: 'browser-capture',
    reason: result.kind,
    ...(result.kind === 'unavailable' ? { detail: result.reason } : {}),
    ...(result.kind === 'api-error' ? { message: result.message } : {}),
  }
}

// ===== معاينة الصفحة الحالية =====

/** مسودة صفحة قابلة للمراجعة قبل الحفظ — لا معرّف مولَّد، ولا كتابة تخزين هنا. */
export interface CurrentPageDraft {
  title: string
  url: string
  linkKind: PageLinkKind
}

/**
 * يعاين الصفحة الحالية دون حفظها. لا تكتشف تكرارًا هنا: اكتشاف التكرار يحتاج
 * مساحة محددة، وهذه المعاينة تسبق اختيار أي مساحة.
 */
export async function inspectCurrentPage(
  readActiveTab: () => Promise<ReadActiveTabResult>,
): Promise<UseCaseResult<CurrentPageDraft>> {
  const result = await readActiveTab()

  if (result.kind !== 'captured') {
    return { ok: false, error: toBrowserCaptureError(result) }
  }

  return {
    ok: true,
    value: { title: result.tab.title, url: result.tab.url, linkKind: result.linkKind },
  }
}

// ===== إضافة الصفحة الحالية إلى مساحة =====

export interface AddCurrentPageToWorkspaceInput {
  workspaceId: WorkspaceId
  order: number
  reason?: string
  progressStatus?: PageProgressStatus
  role?: PageRole
  /** حاضرة فقط إن اختار المستخدم صراحةً إضافة نسخة أخرى رغم تطابق مكتشف مسبقًا. */
  mode?: 'add-new-copy'
}

/**
 * يقرأ الصفحة الحالية من browser، يحوّلها إلى AddPageInput، ثم يستدعي addPage
 * الموجودة أصلًا ويعيد نتيجتها كما هي — بما فيها اكتشاف التكرار وneedsUserDecision.
 * لا تقرر هنا نيابة عن المستخدم إضافة نسخة أخرى؛ mode يصل صراحةً من المدخل فقط.
 * لا browser يقرر workspaceId أو progressStatus أو role — هذه مدخلات بشرية صريحة.
 */
export async function addCurrentPageToWorkspace(
  db: IDBDatabase,
  clock: Clock,
  ids: IdGenerator,
  readActiveTab: () => Promise<ReadActiveTabResult>,
  input: AddCurrentPageToWorkspaceInput,
): Promise<UseCaseResult<AddPageOutcome>> {
  const tabResult = await readActiveTab()

  if (tabResult.kind !== 'captured') {
    return { ok: false, error: toBrowserCaptureError(tabResult) }
  }

  const addPageInput: AddPageInput = {
    workspaceId: input.workspaceId,
    title: tabResult.tab.title,
    url: tabResult.tab.url,
    order: input.order,
    ...(input.reason !== undefined ? { reason: input.reason } : {}),
    ...(input.progressStatus !== undefined ? { progressStatus: input.progressStatus } : {}),
    ...(input.role !== undefined ? { role: input.role } : {}),
    ...(input.mode !== undefined ? { mode: input.mode } : {}),
  }

  return addPage(db, clock, ids, addPageInput)
}

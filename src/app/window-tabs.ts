/**
 * حالات استخدام تبويبات النافذة: معاينتها للاختيار، وإنشاء مساحة من مجموعة
 * مختارة منها.
 *
 * لا chrome.* هنا؛ القراءة والصلاحية تصلان عبر دوال مُحقَنة — نفس نمط Clock
 * وIdGenerator — فيبقى الملف قابلًا للاختبار بقيم ثابتة دون chrome حقيقي.
 */

import type { Clock } from './clock'
import type { IdGenerator } from './ids'
import type { UseCaseResult } from './errors'
import { fromStorageFailure } from './errors'
import type { CreateWorkspaceInput } from './workspaces'
import type { ReadWindowTabsResult } from '../browser/tabs'
import { writeWorkspaceWithPages } from '../storage/workspace-with-pages'
import type { BrowserTabSnapshot, UnavailableTab } from '../core/browser-tab'
import type { Workspace } from '../core/workspace'
import type { SavedPage } from '../core/page'
import { DEFAULT_PAGE_PROGRESS_STATUS, DEFAULT_WORKSPACE_STATUS, DEFAULT_WORKSPACE_TEMPLATE } from '../core/enums'
import { isValidWorkspaceName, normalizeOptionalText } from '../core/validation'
import { normalizeUrlForComparison } from '../core/url'

// ===== معاينة تبويبات النافذة الحالية =====

export interface WindowTabsPreview {
  usable: BrowserTabSnapshot[]
  unavailable: UnavailableTab[]
  hasTabsPermission: boolean
  needsPermission: boolean
}

/**
 * يعاين تبويبات النافذة الحالية للاختيار. لا تطلب صلاحية `tabs` تلقائيًا هنا
 * إطلاقًا — تتحقق فقط من وجودها عبر hasTabsPermission المُحقَنة؛ الطلب فعل
 * منفصل صريح (src/app/permissions.ts).
 */
export async function previewWindowTabs(
  hasTabsPermission: () => Promise<boolean>,
  readCurrentWindowTabs: () => Promise<ReadWindowTabsResult>,
): Promise<UseCaseResult<WindowTabsPreview>> {
  const granted = await hasTabsPermission()

  if (!granted) {
    return {
      ok: true,
      value: { usable: [], unavailable: [], hasTabsPermission: false, needsPermission: true },
    }
  }

  const result = await readCurrentWindowTabs()
  if (result.kind === 'api-error') {
    return { ok: false, error: { kind: 'browser-capture', reason: 'api-error', message: result.message } }
  }

  return {
    ok: true,
    value: {
      usable: result.usable,
      unavailable: result.unavailable,
      hasTabsPermission: true,
      needsPermission: false,
    },
  }
}

// ===== إنشاء مساحة من تبويبات مختارة =====

export interface DuplicateTabGroup {
  normalizedUrl: string
  tabs: BrowserTabSnapshot[]
}

export interface CreateWorkspaceFromTabsInput {
  workspace: CreateWorkspaceInput
  /** التبويبات التي اختارها المستخدم فعليًا — لا تُحفظ كل تبويبات النافذة تلقائيًا. */
  selectedTabs: readonly BrowserTabSnapshot[]
  /** حاضرة فقط إن اختار المستخدم صراحةً حفظ تبويبات متطابقة الرابط رغم التنبيه. */
  allowDuplicateTabs?: boolean
}

export type CreateWorkspaceFromTabsOutcome =
  | { created: true; workspace: Workspace; pages: SavedPage[] }
  | { created: false; duplicates: DuplicateTabGroup[] }

function findDuplicateTabGroups(tabs: readonly BrowserTabSnapshot[]): DuplicateTabGroup[] {
  const groups = new Map<string, BrowserTabSnapshot[]>()

  for (const tab of tabs) {
    const key = normalizeUrlForComparison(tab.url)
    const existing = groups.get(key)
    if (existing !== undefined) existing.push(tab)
    else groups.set(key, [tab])
  }

  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([normalizedUrl, group]) => ({ normalizedUrl, tabs: group }))
}

/**
 * ينشئ مساحة عمل من تبويبات مختارة، ذرّيًا عبر writeWorkspaceWithPages —
 * إما تُكتب المساحة وكل صفحاتها معًا أو لا شيء.
 *
 * يحافظ على ترتيب التبويبات الأصلي عبر إعادة الفرز بـ`index` صراحةً، لا
 * الاعتماد على ترتيب مصفوفة selectedTabs غير الموثق. يضبط activePageId
 * إن كان أحد التبويبات المختارة هو النشط وقت الالتقاط. تطابق الروابط داخل
 * المجموعة المختارة يُعاد كتعارض يحتاج قرار المستخدم، لا دمجًا أو حذفًا صامتًا،
 * إلا إن حدد المدخل allowDuplicateTabs صراحةً.
 *
 * لا تُفتح أو تُغلق أو تُعاد ترتيب أي تبويبات هنا، ولا تُضبط حالة المساحة إلى
 * مجمدة — هذه عمليات مستقلة مؤجَّلة عمدًا خارج هذه المرحلة.
 */
export async function createWorkspaceFromTabs(
  db: IDBDatabase,
  clock: Clock,
  ids: IdGenerator,
  input: CreateWorkspaceFromTabsInput,
): Promise<UseCaseResult<CreateWorkspaceFromTabsOutcome>> {
  const name = input.workspace.name.trim()
  if (!isValidWorkspaceName(name)) {
    return { ok: false, error: { kind: 'invalid-input', field: 'name' } }
  }

  if (input.selectedTabs.length === 0) {
    return { ok: false, error: { kind: 'invalid-input', field: 'selectedTabs' } }
  }

  const sortedTabs = [...input.selectedTabs].sort((a, b) => a.index - b.index)

  if (input.allowDuplicateTabs !== true) {
    const duplicates = findDuplicateTabGroups(sortedTabs)
    if (duplicates.length > 0) {
      return { ok: true, value: { created: false, duplicates } }
    }
  }

  const now = clock.now()
  const goal = normalizeOptionalText(input.workspace.goal)
  const description = normalizeOptionalText(input.workspace.description)
  const workspaceId = ids.workspaceId()

  const pages: SavedPage[] = sortedTabs.map((tab, index) => ({
    id: ids.savedPageId(),
    workspaceId,
    url: tab.url,
    title: tab.title,
    capturedAt: now,
    order: (index + 1) * 1024,
    progressStatus: DEFAULT_PAGE_PROGRESS_STATUS,
    notes: [],
    addedAt: now,
    updatedAt: now,
  }))

  const activeIndex = sortedTabs.findIndex((tab) => tab.active)
  const activePageId = activeIndex === -1 ? undefined : pages[activeIndex]?.id

  const workspace: Workspace = {
    id: workspaceId,
    name,
    template: input.workspace.template ?? DEFAULT_WORKSPACE_TEMPLATE,
    status: DEFAULT_WORKSPACE_STATUS,
    createdAt: now,
    updatedAt: now,
    lastWorkedAt: now,
    ...(goal !== undefined ? { goal } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(activePageId !== undefined ? { activePageId } : {}),
  }

  const written = await writeWorkspaceWithPages(db, workspace, pages)
  if (!written.ok) return { ok: false, error: fromStorageFailure(written) }

  return { ok: true, value: { created: true, workspace, pages } }
}

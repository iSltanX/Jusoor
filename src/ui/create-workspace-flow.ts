/**
 * حالة مسار «إنشاء مساحة من تبويبات النافذة» — دوال خالصة بلا React وبلا DOM.
 *
 * فصلها عن المكونات مقصود: قواعد المسار (ما الذي يُعد اختيارًا صالحًا، ومتى
 * يمتنع التقدم، وما الذي يبقى محفوظًا عند الرجوع أو الفشل) قابلة للاختبار
 * مباشرة بلا تصيير، فيبقى اختبار المكونات مقصورًا على ما لا يُختبر إلا في DOM
 * فعليًا: لوحة المفاتيح والتركيز وربط التسميات.
 *
 * المسودة تُحفظ مستقلة عن الطور: الرجوع من قرار التكرار أو الفشل يعيد الطور
 * وحده ولا يمس المسودة، فلا يفقد المستخدم اختياره ولا ما كتبه.
 */

import type { ApplicationErrorCode } from '../app/errors'
import type { DuplicateTabGroup } from '../app/window-tabs'
import type { BrowserTabSnapshot, UnavailableTab } from '../core/browser-tab'
import { isValidWorkspaceName } from '../core/validation'

/**
 * مسودة الإنشاء.
 *
 * `selected` مفاتيحها **مواضع** داخل `tabs` لا `tabId`: الموضع فريد ومستقر ضمن
 * قراءة واحدة، بينما `tabId` معرّف مورد متصفح لا يُعرض ولا يُخزَّن (قرار 0011).
 */
export interface CreationDraft {
  readonly tabs: readonly BrowserTabSnapshot[]
  readonly unavailable: readonly UnavailableTab[]
  readonly selected: ReadonlySet<number>
  readonly name: string
  readonly goal: string
}

export interface DraftErrors {
  /** الاسم مطلوب — لا يُقبل فارغًا ولا مسافات وحدها. */
  readonly name?: 'required'
  /** تبويب واحد على الأقل — المستخدم هو من يختار، ولا اختيار تلقائي يسبقه. */
  readonly selection?: 'required'
}

/** أطوار المسار بعد قراءة التبويبات. المسودة تعبرها كلها دون فقد. */
export type CreationPhase =
  | { readonly kind: 'editing'; readonly errors: DraftErrors }
  | { readonly kind: 'duplicates'; readonly groups: readonly DuplicateTabGroup[] }
  | { readonly kind: 'creating' }
  | { readonly kind: 'failed'; readonly error: ApplicationErrorCode }

/**
 * يبدأ مسودة من قراءة تبويبات. **لا اختيار مسبق إطلاقًا** — ولا حتى التبويب
 * النشط: اختيار ما يُحفظ قرار المستخدم وحده (دستور المنتج §6.4 و§16).
 */
export function startDraft(
  tabs: readonly BrowserTabSnapshot[],
  unavailable: readonly UnavailableTab[],
): CreationDraft {
  return { tabs, unavailable, selected: new Set(), name: '', goal: '' }
}

export function toggleSelection(draft: CreationDraft, position: number): CreationDraft {
  if (position < 0 || position >= draft.tabs.length) return draft

  const selected = new Set(draft.selected)
  if (!selected.delete(position)) selected.add(position)

  return { ...draft, selected }
}

export function selectAll(draft: CreationDraft): CreationDraft {
  return { ...draft, selected: new Set(draft.tabs.map((_tab, position) => position)) }
}

export function clearSelection(draft: CreationDraft): CreationDraft {
  return { ...draft, selected: new Set() }
}

export function withName(draft: CreationDraft, name: string): CreationDraft {
  return { ...draft, name }
}

export function withGoal(draft: CreationDraft, goal: string): CreationDraft {
  return { ...draft, goal }
}

/** التبويبات المختارة بترتيب النافذة الأصلي — الترتيب لا يتبع ترتيب النقر. */
export function selectedTabs(draft: CreationDraft): BrowserTabSnapshot[] {
  return draft.tabs.filter((_tab, position) => draft.selected.has(position))
}

export function isSelected(draft: CreationDraft, position: number): boolean {
  return draft.selected.has(position)
}

export function allSelected(draft: CreationDraft): boolean {
  return draft.tabs.length > 0 && draft.selected.size === draft.tabs.length
}

/** يتحقق من المسودة ويعيد كل الأخطاء معًا، لا أولها فقط. */
export function validateDraft(draft: CreationDraft): DraftErrors {
  const errors: { name?: 'required'; selection?: 'required' } = {}

  if (!isValidWorkspaceName(draft.name)) errors.name = 'required'
  if (draft.selected.size === 0) errors.selection = 'required'

  return errors
}

export function hasErrors(errors: DraftErrors): boolean {
  return errors.name !== undefined || errors.selection !== undefined
}

/** الهدف نص اختياري؛ الفراغ يعني الغياب فلا يُرسل أصلًا. */
export function draftGoal(draft: CreationDraft): string | undefined {
  const trimmed = draft.goal.trim()
  return trimmed === '' ? undefined : trimmed
}

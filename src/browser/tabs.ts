/**
 * قراءة تبويبات Chrome وتحويلها إلى BrowserTabSnapshot محايد.
 *
 * هذا الملف — مع بقية ملفات src/browser — هو المكان الوحيد المسموح فيه بظهور
 * `chrome.*`. انظر docs/decisions/0005-dependency-direction.md.
 *
 * `chrome.tabs.query` نفسها لا تحتاج صلاحية `tabs`؛ الصلاحية تتحكم فقط في هل
 * تصل الحقول الحساسة (title, url, favIconUrl) مع كل تبويب أم تُحذف من نتيجته
 * — التوثيق الرسمي لواجهة chrome.tabs. لذلك تبويب بلا title/url هنا يعني
 * تعذّر الوصول إلى تلك الحقول (صلاحية غير كافية لأصل ذلك التبويب)، لا غياب
 * التبويب نفسه.
 */

import type {
  BrowserTabSnapshot,
  UnavailableTab,
  UnavailableTabReason,
} from '../core/browser-tab'
import { classifyPageUrl, type PageLinkKind } from '../core/page-link'

/** القيمة متاحة فعليًا إن كانت نصًا يبقى منه شيء بعد trim. */
function isPresentText(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

/**
 * يحوّل تبويب Chrome إلى لقطة محايدة، أو يفسّر تعذّر ذلك.
 *
 * `trim` للتحقق فقط: عند النجاح يُحفظ `title` و`url` **كما وردا حرفيًا** بلا قص —
 * الرابط الأصلي هو ما يُفتح لاحقًا (دستور المنتج §7.2)، والعنوان يبقى كما التُقط (§13.1).
 * لا عنوان بديل يُخترع، ولا اسم نطاق يحل محل العنوان الغائب.
 */
function toSnapshot(
  tab: chrome.tabs.Tab,
): { ok: true; snapshot: BrowserTabSnapshot } | { ok: false; reason: UnavailableTabReason } {
  // الرابط أولًا: بلا رابط لا شيء يُحفظ إطلاقًا، بخلاف العنوان الذي يصف رابطًا موجودًا.
  if (!isPresentText(tab.url)) return { ok: false, reason: 'missing-url' }
  if (!isPresentText(tab.title)) return { ok: false, reason: 'missing-title' }

  const snapshot: BrowserTabSnapshot = {
    title: tab.title,
    url: tab.url,
    index: tab.index,
    active: tab.active,
  }
  if (typeof tab.id === 'number') snapshot.tabId = tab.id
  if (typeof tab.windowId === 'number') snapshot.windowId = tab.windowId

  return { ok: true, snapshot }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

// ===== قراءة التبويب النشط =====

export type ReadActiveTabResult =
  | { kind: 'captured'; tab: BrowserTabSnapshot; linkKind: PageLinkKind }
  | { kind: 'no-suitable-tab' }
  | { kind: 'unavailable'; reason: UnavailableTabReason }
  | { kind: 'api-error'; message: string }

/**
 * يقرأ التبويب النشط في النافذة الحالية. لا تستخدم أقل من `activeTab` نفسها —
 * لا تطلب أي صلاحية إضافية، ولا تفتح صلاحية جديدة بنفسها.
 *
 * يجب أن تُستدعى مباشرة داخل معالج فعل صريح من المستخدم: `activeTab` لا تمنح
 * title/url إلا في استجابة لأحد الأفعال المؤهِّلة (نقر أيقونة الإجراء، عنصر
 * قائمة سياق، اختصار لوحة مفاتيح، اختيار من omnibox) — التوثيق الرسمي لـ
 * activeTab. القرار بشأن ما يُعد فعلًا صريحًا يبقى مسؤولية من يستدعي هذه
 * الدالة، لا هي نفسها.
 *
 * لا تحفظ شيئًا بنفسها، ولا تعرض نصوص واجهة، ولا تخترع title أو url غائبين.
 */
export async function readActiveTab(): Promise<ReadActiveTabResult> {
  let tabs: chrome.tabs.Tab[]
  try {
    tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  } catch (error) {
    return { kind: 'api-error', message: messageOf(error) }
  }

  const tab = tabs[0]
  if (tab === undefined) return { kind: 'no-suitable-tab' }

  const converted = toSnapshot(tab)
  if (!converted.ok) return { kind: 'unavailable', reason: converted.reason }

  return {
    kind: 'captured',
    tab: converted.snapshot,
    linkKind: classifyPageUrl(converted.snapshot.url),
  }
}

// ===== قراءة تبويبات النافذة الحالية =====

export type ReadWindowTabsResult =
  | { kind: 'read'; usable: BrowserTabSnapshot[]; unavailable: UnavailableTab[] }
  | { kind: 'api-error'; message: string }

/**
 * يقرأ تبويبات النافذة الحالية بترتيب index. لا تطلب صلاحية `tabs` بنفسها
 * ولا تتحقق من وجودها — تفترض أن قرار طلبها والتحقق منه تم في طبقة تنسيق
 * أعلى (app/) قبل استدعائها؛ انظر src/browser/permissions.ts.
 *
 * تبويب بلا title/url لا يُسقط صامتًا: يظهر في `unavailable` بترتيبه وسبب
 * تعذّره فقط — لا رابطه ولا عنوانه، فلا داعي لكشفهما وهما أصلًا غير متاحين.
 */
export async function readCurrentWindowTabs(): Promise<ReadWindowTabsResult> {
  let tabs: chrome.tabs.Tab[]
  try {
    tabs = await chrome.tabs.query({ currentWindow: true })
  } catch (error) {
    return { kind: 'api-error', message: messageOf(error) }
  }

  const sorted = [...tabs].sort((a, b) => a.index - b.index)

  const usable: BrowserTabSnapshot[] = []
  const unavailable: UnavailableTab[] = []

  for (const tab of sorted) {
    const converted = toSnapshot(tab)
    if (!converted.ok) {
      unavailable.push({ index: tab.index, reason: converted.reason })
      continue
    }
    usable.push(converted.snapshot)
  }

  return { kind: 'read', usable, unavailable }
}

// ===== فتح التبويبات وإغلاقها =====

export type OpenTabOutcome =
  | { kind: 'opened'; tabId?: number }
  | { kind: 'unavailable'; message?: string }

/**
 * يفتح تبويبًا واحدًا. **لا يحتاج أي صلاحية** — التوثيق الرسمي، وقرار 0013.
 *
 * لا قائمة منع مسبقة للمخططات: المتصفح وحده يقرر ما يرفض فتحه، فتُحاوَل الصفحة
 * ويُبلَّغ عمّا حدث فعلًا. رفض المتصفح يعود `unavailable` لا استثناءً منتشرًا.
 */
export async function openTab(
  url: string,
  options: { active: boolean },
): Promise<OpenTabOutcome> {
  try {
    const tab = await chrome.tabs.create({ url, active: options.active })
    return typeof tab.id === 'number' ? { kind: 'opened', tabId: tab.id } : { kind: 'opened' }
  } catch (error) {
    return { kind: 'unavailable', message: messageOf(error) }
  }
}

export type CloseTabsOutcome =
  | { kind: 'closed'; count: number }
  | { kind: 'api-error'; message: string }

/**
 * يغلق تبويبات محددة بمعرفاتها. **لا يحتاج أي صلاحية** للإغلاق نفسه؛ معرفة
 * *أيّ* تبويب يخص المساحة هي ما يحتاج `tabs` — وذلك يقع في طبقة أعلى (0013).
 *
 * قائمة فارغة عملية بلا أثر: لا استدعاء أصلًا.
 */
export async function closeTabs(tabIds: readonly number[]): Promise<CloseTabsOutcome> {
  if (tabIds.length === 0) return { kind: 'closed', count: 0 }

  try {
    await chrome.tabs.remove([...tabIds])
    return { kind: 'closed', count: tabIds.length }
  } catch (error) {
    return { kind: 'api-error', message: messageOf(error) }
  }
}

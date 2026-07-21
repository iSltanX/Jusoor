import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { openDatabase } from '../../src/storage/database'
import { readWorkspace, writeWorkspace } from '../../src/storage/workspaces'
import { writeSavedPage } from '../../src/storage/pages'
import {
  freezeWorkspace,
  readReturnSummary,
  restoreWorkspacePages,
} from '../../src/app/workspace-lifecycle'
import type { Clock } from '../../src/app/clock'
import type {
  CloseTabsOutcome,
  OpenTabOutcome,
  ReadWindowTabsResult,
} from '../../src/browser/tabs'
import type { BrowserTabSnapshot } from '../../src/core/browser-tab'
import { asSavedPageId, asWorkspaceId } from '../../src/core/ids'
import type { Workspace } from '../../src/core/workspace'
import type { SavedPage } from '../../src/core/page'

/**
 * التجميد والعودة هما أول أثر فعلي على المتصفح. الاختبارات هنا تثبت الترتيب
 * الذي قرره 0013: الحالة تُحفظ قبل لمس أي تبويب، والفشل يُعلَن ولا يُبتلع.
 */

const SEEDED = 1_000
const NOW = 9_000
const WORKSPACE_ID = asWorkspaceId('w1')

let db: IDBDatabase

beforeEach(async () => {
  db = await openDatabase(new IDBFactory())
  await writeWorkspace(db, makeWorkspace())
})

function makeClock(time = NOW): Clock {
  return { now: () => time }
}

function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: WORKSPACE_ID,
    name: 'مساحة',
    template: 'general',
    status: 'active',
    createdAt: SEEDED,
    updatedAt: SEEDED,
    lastWorkedAt: SEEDED,
    ...overrides,
  }
}

function makePage(overrides: Partial<SavedPage> = {}): SavedPage {
  return {
    id: asSavedPageId('p1'),
    workspaceId: WORKSPACE_ID,
    url: 'https://example.com/one',
    title: 'الأولى',
    capturedAt: SEEDED,
    order: 1024,
    progressStatus: 'not-started',
    notes: [],
    addedAt: SEEDED,
    updatedAt: SEEDED,
    ...overrides,
  }
}

/** بديل طبقة المتصفح — لا `chrome` حقيقي في اختبارات app. */
function makeBrowser(
  overrides: {
    granted?: boolean
    tabs?: BrowserTabSnapshot[]
    readFails?: boolean
    closeFails?: boolean
  } = {},
) {
  const closeTabs = vi.fn(
    (ids: readonly number[]): Promise<CloseTabsOutcome> =>
      Promise.resolve(
        overrides.closeFails === true
          ? { kind: 'api-error', message: 'boom' }
          : { kind: 'closed', count: ids.length },
      ),
  )

  const readCurrentWindowTabs = vi.fn(
    (): Promise<ReadWindowTabsResult> =>
      Promise.resolve(
        overrides.readFails === true
          ? { kind: 'api-error', message: 'boom' }
          : { kind: 'read', usable: overrides.tabs ?? [], unavailable: [] },
      ),
  )

  return {
    closeTabs,
    readCurrentWindowTabs,
    hasTabsPermission: vi.fn((): Promise<boolean> => Promise.resolve(overrides.granted ?? true)),
  }
}

/** مولّد فتح تبويب مُنمَّط، فتبقى `mock.calls` معروفة الأنواع. */
function makeOpenTab(outcome: (url: string) => OpenTabOutcome = () => ({ kind: 'opened' })) {
  return vi.fn(
    (url: string, options: { active: boolean }): Promise<OpenTabOutcome> => {
      void options
      return Promise.resolve(outcome(url))
    },
  )
}

describe('freezeWorkspace — الحالة قبل التبويبات', () => {
  it('يجمّد المساحة دون لمس أي تبويب حين لا يُطلب الإغلاق', async () => {
    const browser = makeBrowser()

    const result = await freezeWorkspace(db, makeClock(), browser, {
      workspaceId: WORKSPACE_ID,
      closeOpenTabs: false,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.workspace.status).toBe('frozen')
    expect(result.value.closedTabs).toBe(0)
    expect(browser.readCurrentWindowTabs).not.toHaveBeenCalled()
    expect(browser.closeTabs).not.toHaveBeenCalled()
  })

  it('يحفظ نقطة التوقف والخطوة التالية مع التجميد', async () => {
    const result = await freezeWorkspace(db, makeClock(), makeBrowser(), {
      workspaceId: WORKSPACE_ID,
      lastReached: 'توقفت هنا',
      nextStep: 'أكمل هنا',
      closeOpenTabs: false,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.workspace.lastReached).toBe('توقفت هنا')
    expect(result.value.workspace.nextStep).toBe('أكمل هنا')
  })

  it('يغلق تبويبات المساحة وحدها لا كل التبويبات', async () => {
    await writeSavedPage(db, makePage({ url: 'https://example.com/one' }))
    await writeSavedPage(db, makePage({ id: asSavedPageId('p2'), url: 'https://example.com/two' }))

    const browser = makeBrowser({
      tabs: [
        { title: 'أولى', url: 'https://example.com/one', index: 0, active: false, tabId: 11 },
        { title: 'غريبة', url: 'https://other.example/x', index: 1, active: false, tabId: 22 },
        { title: 'ثانية', url: 'https://example.com/two', index: 2, active: false, tabId: 33 },
      ],
    })

    const result = await freezeWorkspace(db, makeClock(), browser, {
      workspaceId: WORKSPACE_ID,
      closeOpenTabs: true,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.closedTabs).toBe(2)
    // التبويب الغريب (22) لم يُمسّ
    expect(browser.closeTabs).toHaveBeenCalledWith([11, 33])
  })

  it('يطابق الروابط بعد التطبيع فيغلق نسخة تحمل معاملات تتبع', async () => {
    await writeSavedPage(db, makePage({ url: 'https://example.com/one' }))

    const browser = makeBrowser({
      tabs: [
        {
          title: 'أولى',
          url: 'https://example.com/one?utm_source=x',
          index: 0,
          active: false,
          tabId: 11,
        },
      ],
    })

    await freezeWorkspace(db, makeClock(), browser, {
      workspaceId: WORKSPACE_ID,
      closeOpenTabs: true,
    })

    expect(browser.closeTabs).toHaveBeenCalledWith([11])
  })

  it('بلا صلاحية tabs: يُجمَّد ولا يُغلق شيء، ويُبلَّغ بالفارق', async () => {
    await writeSavedPage(db, makePage())
    const browser = makeBrowser({ granted: false })

    const result = await freezeWorkspace(db, makeClock(), browser, {
      workspaceId: WORKSPACE_ID,
      closeOpenTabs: true,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.workspace.status).toBe('frozen')
    expect(result.value.needsTabsPermission).toBe(true)
    expect(result.value.closedTabs).toBe(0)
    expect(browser.closeTabs).not.toHaveBeenCalled()

    // الحالة محفوظة فعلًا في التخزين لا في القيمة المعادة وحدها
    const stored = await readWorkspace(db, WORKSPACE_ID)
    expect(stored.status === 'found' && stored.value.status).toBe('frozen')
  })

  it('فشل قراءة التبويبات لا يُلغي التجميد ويُعلَن صراحةً', async () => {
    const result = await freezeWorkspace(db, makeClock(), makeBrowser({ readFails: true }), {
      workspaceId: WORKSPACE_ID,
      closeOpenTabs: true,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.workspace.status).toBe('frozen')
    expect(result.value.closeFailed).toBe(true)
  })

  it('فشل الإغلاق نفسه لا يُلغي التجميد ويُعلَن صراحةً', async () => {
    await writeSavedPage(db, makePage())
    const browser = makeBrowser({
      closeFails: true,
      tabs: [
        { title: 'أولى', url: 'https://example.com/one', index: 0, active: false, tabId: 11 },
      ],
    })

    const result = await freezeWorkspace(db, makeClock(), browser, {
      workspaceId: WORKSPACE_ID,
      closeOpenTabs: true,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.workspace.status).toBe('frozen')
    expect(result.value.closeFailed).toBe(true)
  })

  it('يرفض تجميد مساحة مجمدة أصلًا ولا يلمس أي تبويب', async () => {
    await writeWorkspace(db, makeWorkspace({ status: 'frozen', frozenAt: SEEDED }))
    const browser = makeBrowser()

    const result = await freezeWorkspace(db, makeClock(), browser, {
      workspaceId: WORKSPACE_ID,
      closeOpenTabs: true,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'domain', code: 'workspace/invalid-status-transition' })
    expect(browser.closeTabs).not.toHaveBeenCalled()
  })
})

describe('restoreWorkspacePages — الفتح والعودة', () => {
  beforeEach(async () => {
    await writeWorkspace(db, makeWorkspace({ status: 'frozen', frozenAt: SEEDED }))
    await writeSavedPage(db, makePage({ id: asSavedPageId('a'), title: 'أ', order: 1024 }))
    await writeSavedPage(
      db,
      makePage({ id: asSavedPageId('b'), title: 'ب', order: 2048, url: 'https://example.com/two' }),
    )
    await writeSavedPage(
      db,
      makePage({ id: asSavedPageId('c'), title: 'ج', order: 3072, url: 'https://example.com/three' }),
    )
  })

  it('يفتح الصفحات المختارة وحدها لا كل الصفحات', async () => {
    const openTab = makeOpenTab(() => ({ kind: 'opened', tabId: 1 }))

    const result = await restoreWorkspacePages(db, makeClock(), openTab, {
      workspaceId: WORKSPACE_ID,
      pageIds: [asSavedPageId('a'), asSavedPageId('c')],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.openedCount).toBe(2)
    expect(openTab).toHaveBeenCalledTimes(2)
    expect(openTab.mock.calls.map((call) => call[0])).toEqual([
      'https://example.com/one',
      'https://example.com/three',
    ])
  })

  it('يفتح بترتيب order المحفوظ لا بترتيب الاختيار', async () => {
    const openTab = makeOpenTab()

    await restoreWorkspacePages(db, makeClock(), openTab, {
      workspaceId: WORKSPACE_ID,
      pageIds: [asSavedPageId('c'), asSavedPageId('a'), asSavedPageId('b')],
    })

    expect(openTab.mock.calls.map((call) => call[0])).toEqual([
      'https://example.com/one',
      'https://example.com/two',
      'https://example.com/three',
    ])
  })

  it('التبويب النشط وحده يُفتح نشطًا', async () => {
    await writeWorkspace(
      db,
      makeWorkspace({ status: 'frozen', frozenAt: SEEDED, activePageId: asSavedPageId('b') }),
    )
    const openTab = makeOpenTab()

    await restoreWorkspacePages(db, makeClock(), openTab, {
      workspaceId: WORKSPACE_ID,
      pageIds: [asSavedPageId('a'), asSavedPageId('b')],
    })

    expect(openTab.mock.calls.map((call) => call[1])).toEqual([{ active: false }, { active: true }])
  })

  it('يعيد المساحة إلى النشاط عند بدء العودة', async () => {
    const openTab = makeOpenTab()

    const result = await restoreWorkspacePages(db, makeClock(), openTab, {
      workspaceId: WORKSPACE_ID,
      pageIds: [asSavedPageId('a')],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.workspace.status).toBe('active')
    expect(result.value.workspace.frozenAt).toBeUndefined()
    expect(result.value.workspace.lastWorkedAt).toBe(NOW)
  })

  it('الفشل الجزئي يظهر بصدق ولا يُعرض نجاحًا كاملًا', async () => {
    const openTab = makeOpenTab((url) =>
      url.includes('two')
        ? { kind: 'unavailable', message: 'رفض المتصفح' }
        : { kind: 'opened' },
    )

    const result = await restoreWorkspacePages(db, makeClock(), openTab, {
      workspaceId: WORKSPACE_ID,
      pageIds: [asSavedPageId('a'), asSavedPageId('b')],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.openedCount).toBe(1)
    expect(result.value.unavailableCount).toBe(1)

    const failed = result.value.results.find((entry) => entry.pageId === 'b')
    expect(failed?.status).toBe('unavailable')
    expect(failed?.message).toBe('رفض المتصفح')
  })

  it('لا تُخزَّن نتيجة الفتح في الصفحة — حالة جلسة فقط (0009)', async () => {
    const openTab = makeOpenTab(() => ({ kind: 'unavailable' }))

    await restoreWorkspacePages(db, makeClock(), openTab, {
      workspaceId: WORKSPACE_ID,
      pageIds: [asSavedPageId('a')],
    })

    const { readSavedPage } = await import('../../src/storage/pages')
    const stored = await readSavedPage(db, asSavedPageId('a'))
    expect(stored.status).toBe('found')
    if (stored.status !== 'found') return
    expect(Object.keys(stored.value)).not.toContain('tabOpeningStatus')
    expect(Object.keys(stored.value)).not.toContain('restoreStatus')
  })

  it('اختيار فارغ لا يفتح شيئًا لكنه يعيد المساحة إلى النشاط', async () => {
    const openTab = makeOpenTab()

    const result = await restoreWorkspacePages(db, makeClock(), openTab, {
      workspaceId: WORKSPACE_ID,
      pageIds: [],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(openTab).not.toHaveBeenCalled()
    expect(result.value.workspace.status).toBe('active')
  })

  it('يعمل على مساحة نشطة أصلًا دون رفض انتقال', async () => {
    await writeWorkspace(db, makeWorkspace({ status: 'active' }))
    const openTab = makeOpenTab()

    const result = await restoreWorkspacePages(db, makeClock(), openTab, {
      workspaceId: WORKSPACE_ID,
      pageIds: [asSavedPageId('a')],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.workspace.status).toBe('active')
    expect(result.value.openedCount).toBe(1)
  })

  it('مساحة غير موجودة تعيد not-found بلا فتح', async () => {
    const openTab = makeOpenTab()

    const result = await restoreWorkspacePages(db, makeClock(), openTab, {
      workspaceId: asWorkspaceId('ghost'),
      pageIds: [asSavedPageId('a')],
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'not-found', entity: 'workspace' })
    expect(openTab).not.toHaveBeenCalled()
  })
})

describe('readReturnSummary — قراءة خالصة', () => {
  it('يميّز ما بقي عن المكتمل وعن الأساسي', async () => {
    await writeSavedPage(db, makePage({ id: asSavedPageId('a'), progressStatus: 'complete' }))
    await writeSavedPage(
      db,
      makePage({ id: asSavedPageId('b'), progressStatus: 'in-progress', role: 'primary' }),
    )
    await writeSavedPage(db, makePage({ id: asSavedPageId('c'), progressStatus: 'not-started' }))

    const result = await readReturnSummary(db, makeClock(), WORKSPACE_ID)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.pages).toHaveLength(3)
    expect(result.value.remaining.map((page) => page.id).sort()).toEqual(['b', 'c'])
    expect(result.value.important.map((page) => page.id)).toEqual(['b'])
  })

  it('لا يغيّر حالة المساحة ولا يفتح شيئًا', async () => {
    await writeWorkspace(db, makeWorkspace({ status: 'frozen', frozenAt: SEEDED }))

    await readReturnSummary(db, makeClock(), WORKSPACE_ID)

    const stored = await readWorkspace(db, WORKSPACE_ID)
    expect(stored.status === 'found' && stored.value.status).toBe('frozen')
    expect(stored.status === 'found' && stored.value.lastWorkedAt).toBe(SEEDED)
  })

  it('يحمل لحظة القراءة من الساعة المحقونة', async () => {
    const result = await readReturnSummary(db, makeClock(4242), WORKSPACE_ID)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.loadedAt).toBe(4242)
  })
})

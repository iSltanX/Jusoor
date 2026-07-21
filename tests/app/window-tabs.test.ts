import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'

import { openDatabase } from '../../src/storage/database'
import { listPagesByWorkspace } from '../../src/storage/pages'
import { listWorkspaces, readWorkspace } from '../../src/storage/workspaces'
import { createWorkspaceFromTabs, previewWindowTabs } from '../../src/app/window-tabs'
import type { Clock } from '../../src/app/clock'
import type { IdGenerator } from '../../src/app/ids'
import type { ReadWindowTabsResult } from '../../src/browser/tabs'
import type { BrowserTabSnapshot } from '../../src/core/browser-tab'
import { asPageNoteId, asSavedPageId, asWorkspaceId } from '../../src/core/ids'

let db: IDBDatabase

beforeEach(async () => {
  db = await openDatabase(new IDBFactory())
})

function makeClock(time = 1000): Clock {
  return { now: () => time }
}

function makeIds(prefix = 'gen'): IdGenerator {
  let counter = 0
  return {
    workspaceId: () => asWorkspaceId(`${prefix}-workspace-${String(++counter)}`),
    savedPageId: () => asSavedPageId(`${prefix}-page-${String(++counter)}`),
    pageNoteId: () => asPageNoteId(`${prefix}-note-${String(++counter)}`),
  }
}

function tab(overrides: Partial<BrowserTabSnapshot> = {}): BrowserTabSnapshot {
  return { title: 'عنوان', url: 'https://example.com/1', index: 0, active: false, ...overrides }
}

describe('previewWindowTabs', () => {
  it('يعيد needsPermission: true دون استدعاء قراءة التبويبات إن غابت الصلاحية', async () => {
    let readCalled = false
    const readCurrentWindowTabs = (): Promise<ReadWindowTabsResult> => {
      readCalled = true
      return Promise.resolve({ kind: 'read', usable: [], unavailable: [] })
    }

    const result = await previewWindowTabs(() => Promise.resolve(false), readCurrentWindowTabs)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toEqual({
      usable: [],
      unavailable: [],
      hasTabsPermission: false,
      needsPermission: true,
    })
    expect(readCalled).toBe(false)
  })

  it('لا تطلب الصلاحية بنفسها — تفحص فقط', async () => {
    let containsCalls = 0
    const result = await previewWindowTabs(
      () => {
        containsCalls += 1
        return Promise.resolve(true)
      },
      () => Promise.resolve({ kind: 'read', usable: [tab()], unavailable: [] }),
    )

    expect(result.ok).toBe(true)
    expect(containsCalls).toBe(1)
  })

  it('يعيد التبويبات القابلة للاختيار وغير المتاحة عند وجود الصلاحية', async () => {
    const result = await previewWindowTabs(
      () => Promise.resolve(true),
      () =>
        Promise.resolve({
          kind: 'read',
          usable: [tab({ title: 'أ' }), tab({ title: 'ب' })],
          unavailable: [{ index: 5, reason: 'missing-url' }],
        }),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.usable).toHaveLength(2)
    expect(result.value.unavailable).toEqual([{ index: 5, reason: 'missing-url' }])
    expect(result.value.hasTabsPermission).toBe(true)
    expect(result.value.needsPermission).toBe(false)
  })

  it('يحوّل خطأ قراءة التبويبات إلى browser-capture', async () => {
    const result = await previewWindowTabs(
      () => Promise.resolve(true),
      () => Promise.resolve({ kind: 'api-error', message: 'فشل الاستعلام' }),
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'browser-capture', reason: 'api-error', message: 'فشل الاستعلام' })
  })
})

describe('createWorkspaceFromTabs', () => {
  it('ينشئ مساحة من تبويب واحد', async () => {
    const result = await createWorkspaceFromTabs(db, makeClock(1000), makeIds(), {
      workspace: { name: 'مساحة من تبويب' },
      selectedTabs: [tab({ title: 'وثيقة', url: 'https://example.com/doc', index: 0, active: true })],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.created).toBe(true)
    if (!result.value.created) return
    expect(result.value.pages).toHaveLength(1)
    expect(result.value.pages[0]?.title).toBe('وثيقة')
    expect(result.value.pages[0]?.url).toBe('https://example.com/doc')
  })

  it('ينشئ مساحة من عدة تبويبات محافظًا على ترتيبها الأصلي حسب index', async () => {
    const result = await createWorkspaceFromTabs(db, makeClock(1000), makeIds(), {
      workspace: { name: 'مساحة' },
      selectedTabs: [
        tab({ title: 'ثالث', url: 'https://example.com/3', index: 2 }),
        tab({ title: 'أول', url: 'https://example.com/1', index: 0 }),
        tab({ title: 'ثانٍ', url: 'https://example.com/2', index: 1 }),
      ],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.created).toBe(true)
    if (!result.value.created) return
    expect(result.value.pages.map((p) => p.title)).toEqual(['أول', 'ثانٍ', 'ثالث'])
    expect(result.value.pages.map((p) => p.order)).toEqual([1024, 2048, 3072])
  })

  it('الاسم وحده يكفي لإنشاء المساحة — الحقول الاختيارية تبقى اختيارية', async () => {
    const result = await createWorkspaceFromTabs(db, makeClock(1000), makeIds(), {
      workspace: { name: 'مساحة بالاسم فقط' },
      selectedTabs: [tab()],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    if (!result.value.created) return
    expect(result.value.workspace.goal).toBeUndefined()
    expect(result.value.workspace.description).toBeUndefined()
  })

  it('كل صفحة تحصل على SavedPageId مستقل من IdGenerator', async () => {
    const result = await createWorkspaceFromTabs(db, makeClock(1000), makeIds(), {
      workspace: { name: 'مساحة' },
      selectedTabs: [tab({ index: 0 }), tab({ index: 1, url: 'https://example.com/2' })],
    })

    expect(result.ok).toBe(true)
    if (!result.ok || !result.value.created) return
    const ids = result.value.pages.map((p) => p.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('لا يخزن tabId كمعرف دائم — SavedPage لا يحمل الحقل إطلاقًا', async () => {
    const result = await createWorkspaceFromTabs(db, makeClock(1000), makeIds(), {
      workspace: { name: 'مساحة' },
      selectedTabs: [tab({ tabId: 999, windowId: 5 })],
    })

    expect(result.ok).toBe(true)
    if (!result.ok || !result.value.created) return
    expect('tabId' in result.value.pages[0]!).toBe(false)
  })

  it('يضبط activePageId على الصفحة المقابلة للتبويب النشط وقت الالتقاط', async () => {
    const result = await createWorkspaceFromTabs(db, makeClock(1000), makeIds(), {
      workspace: { name: 'مساحة' },
      selectedTabs: [
        tab({ index: 0, url: 'https://example.com/1', active: false }),
        tab({ index: 1, url: 'https://example.com/2', active: true }),
      ],
    })

    expect(result.ok).toBe(true)
    if (!result.ok || !result.value.created) return
    const activePage = result.value.pages.find((p) => p.url === 'https://example.com/2')
    expect(result.value.workspace.activePageId).toBe(activePage?.id)
  })

  it('لا يضبط activePageId إن لم يكن أي تبويب مختار نشطًا', async () => {
    const result = await createWorkspaceFromTabs(db, makeClock(1000), makeIds(), {
      workspace: { name: 'مساحة' },
      selectedTabs: [tab({ active: false })],
    })

    expect(result.ok).toBe(true)
    if (!result.ok || !result.value.created) return
    expect(result.value.workspace.activePageId).toBeUndefined()
  })

  it('تطابق رابطين داخل المجموعة المختارة يعيد تعارضًا يحتاج قرار المستخدم، ولا يحفظ شيئًا', async () => {
    const result = await createWorkspaceFromTabs(db, makeClock(1000), makeIds(), {
      workspace: { name: 'مساحة' },
      selectedTabs: [
        tab({ index: 0, url: 'https://example.com/docs' }),
        tab({ index: 1, url: 'https://example.com/docs?utm_source=x' }),
      ],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.created).toBe(false)
    if (result.value.created) return
    expect(result.value.duplicates).toHaveLength(1)
    expect(result.value.duplicates[0]?.tabs).toHaveLength(2)

    const allWorkspaces = await listWorkspaces(db)
    expect(allWorkspaces.items).toEqual([])
  })

  it('allowDuplicateTabs: true يحفظ التبويبات المتطابقة معًا دون دمج', async () => {
    const result = await createWorkspaceFromTabs(db, makeClock(1000), makeIds(), {
      workspace: { name: 'مساحة' },
      selectedTabs: [
        tab({ index: 0, url: 'https://example.com/docs' }),
        tab({ index: 1, url: 'https://example.com/docs' }),
      ],
      allowDuplicateTabs: true,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.created).toBe(true)
    if (!result.value.created) return
    expect(result.value.pages).toHaveLength(2)
  })

  it('يرفض اسمًا فارغًا', async () => {
    const result = await createWorkspaceFromTabs(db, makeClock(), makeIds(), {
      workspace: { name: '   ' },
      selectedTabs: [tab()],
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'invalid-input', field: 'name' })
  })

  it('يرفض قائمة تبويبات فارغة', async () => {
    const result = await createWorkspaceFromTabs(db, makeClock(), makeIds(), {
      workspace: { name: 'مساحة' },
      selectedTabs: [],
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'invalid-input', field: 'selectedTabs' })
  })

  it('نجاح الإنشاء يكتب المساحة وكل الصفحات معًا دفعة واحدة قابلة للقراءة فورًا', async () => {
    const result = await createWorkspaceFromTabs(db, makeClock(1000), makeIds(), {
      workspace: { name: 'مساحة' },
      selectedTabs: [tab({ index: 0 }), tab({ index: 1, url: 'https://example.com/2' })],
    })

    expect(result.ok).toBe(true)
    if (!result.ok || !result.value.created) return

    const readBack = await readWorkspace(db, result.value.workspace.id)
    expect(readBack.status).toBe('found')

    const pages = await listPagesByWorkspace(db, result.value.workspace.id)
    expect(pages.items).toHaveLength(2)
  })
})

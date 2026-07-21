import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'

import { openDatabase } from '../../src/storage/database'
import { writeWorkspace } from '../../src/storage/workspaces'
import { listPagesByWorkspace } from '../../src/storage/pages'
import { addCurrentPageToWorkspace, inspectCurrentPage } from '../../src/app/current-page'
import type { Clock } from '../../src/app/clock'
import type { IdGenerator } from '../../src/app/ids'
import type { ReadActiveTabResult } from '../../src/browser/tabs'
import { asPageNoteId, asSavedPageId, asWorkspaceId } from '../../src/core/ids'
import type { Workspace } from '../../src/core/workspace'

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

function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: asWorkspaceId('w1'),
    name: 'مساحة',
    template: 'general',
    status: 'active',
    createdAt: 1000,
    updatedAt: 1000,
    lastWorkedAt: 1000,
    ...overrides,
  }
}

function capturedTab(overrides: Partial<{ title: string; url: string }> = {}): () => Promise<ReadActiveTabResult> {
  const title = overrides.title ?? 'عنوان التبويب'
  const url = overrides.url ?? 'https://example.com/docs'
  return () =>
    Promise.resolve({
      kind: 'captured',
      tab: { title, url, index: 0, active: true },
      linkKind: 'http',
    })
}

describe('inspectCurrentPage', () => {
  it('يعيد مسودة بعنوان ورابط التبويب الحالي دون كتابة إلى التخزين', async () => {
    const result = await inspectCurrentPage(capturedTab({ title: 'وثيقة', url: 'https://example.com/x' }))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toEqual({ title: 'وثيقة', url: 'https://example.com/x', linkKind: 'http' })
  })

  it('لا يكتب أي صفحة إلى أي مساحة', async () => {
    await writeWorkspace(db, makeWorkspace())
    await inspectCurrentPage(capturedTab())

    const pages = await listPagesByWorkspace(db, asWorkspaceId('w1'))
    expect(pages.items).toEqual([])
  })

  it('يحوّل no-suitable-tab إلى خطأ browser-capture واضح', async () => {
    const result = await inspectCurrentPage(() => Promise.resolve({ kind: 'no-suitable-tab' }))

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'browser-capture', reason: 'no-suitable-tab' })
  })

  it('يحوّل unavailable محتفظًا بسببه المفصَّل — غياب الرابط غير غياب العنوان', async () => {
    const noUrl = await inspectCurrentPage(() =>
      Promise.resolve({ kind: 'unavailable', reason: 'missing-url' }),
    )

    expect(noUrl.ok).toBe(false)
    if (noUrl.ok) return
    expect(noUrl.error).toEqual({
      kind: 'browser-capture',
      reason: 'unavailable',
      detail: 'missing-url',
    })

    const noTitle = await inspectCurrentPage(() =>
      Promise.resolve({ kind: 'unavailable', reason: 'missing-title' }),
    )

    expect(noTitle.ok).toBe(false)
    if (noTitle.ok) return
    expect(noTitle.error).toEqual({
      kind: 'browser-capture',
      reason: 'unavailable',
      detail: 'missing-title',
    })
  })

  it('يحوّل api-error مع الحفاظ على رسالته', async () => {
    const result = await inspectCurrentPage(() =>
      Promise.resolve({ kind: 'api-error', message: 'تعذر الوصول إلى chrome.tabs' }),
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({
      kind: 'browser-capture',
      reason: 'api-error',
      message: 'تعذر الوصول إلى chrome.tabs',
    })
  })
})

describe('addCurrentPageToWorkspace', () => {
  it('يضيف الصفحة الحالية بعنوانها ورابطها الأصليين إلى مساحة موجودة', async () => {
    await writeWorkspace(db, makeWorkspace())

    const result = await addCurrentPageToWorkspace(
      db,
      makeClock(2000),
      makeIds(),
      capturedTab({ title: 'عنوان أصلي', url: 'https://example.com/original' }),
      { workspaceId: asWorkspaceId('w1'), order: 1024 },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.saved).toBe(true)
    expect(result.value.page.title).toBe('عنوان أصلي')
    expect(result.value.page.url).toBe('https://example.com/original')
  })

  it('يعيد نتيجة اكتشاف التكرار كما هي دون حفظ تلقائي', async () => {
    await writeWorkspace(db, makeWorkspace())
    const ids = makeIds()

    await addCurrentPageToWorkspace(db, makeClock(1000), ids, capturedTab({ url: 'https://example.com/docs' }), {
      workspaceId: asWorkspaceId('w1'),
      order: 1024,
    })

    const second = await addCurrentPageToWorkspace(
      db,
      makeClock(2000),
      ids,
      capturedTab({ url: 'https://example.com/docs?utm_source=x' }),
      { workspaceId: asWorkspaceId('w1'), order: 2048 },
    )

    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.value.saved).toBe(false)
    expect(second.value.needsUserDecision).toBe(true)
    expect(second.value.matches).toHaveLength(1)
  })

  it('يحفظ نسخة أخرى فعليًا عند mode: add-new-copy الصريح', async () => {
    await writeWorkspace(db, makeWorkspace())
    const ids = makeIds()

    await addCurrentPageToWorkspace(db, makeClock(1000), ids, capturedTab({ url: 'https://example.com/docs' }), {
      workspaceId: asWorkspaceId('w1'),
      order: 1024,
    })

    const second = await addCurrentPageToWorkspace(
      db,
      makeClock(2000),
      ids,
      capturedTab({ url: 'https://example.com/docs' }),
      { workspaceId: asWorkspaceId('w1'), order: 2048, mode: 'add-new-copy' },
    )

    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.value.saved).toBe(true)

    const all = await listPagesByWorkspace(db, asWorkspaceId('w1'))
    expect(all.items).toHaveLength(2)
  })

  it('يرفض مساحة غير موجودة', async () => {
    const result = await addCurrentPageToWorkspace(db, makeClock(), makeIds(), capturedTab(), {
      workspaceId: asWorkspaceId('ghost'),
      order: 0,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'not-found', entity: 'workspace' })
  })

  it('لا يحفظ شيئًا إن تعذّرت قراءة الصفحة الحالية', async () => {
    await writeWorkspace(db, makeWorkspace())

    const result = await addCurrentPageToWorkspace(
      db,
      makeClock(),
      makeIds(),
      () => Promise.resolve({ kind: 'no-suitable-tab' }),
      { workspaceId: asWorkspaceId('w1'), order: 0 },
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'browser-capture', reason: 'no-suitable-tab' })

    const pages = await listPagesByWorkspace(db, asWorkspaceId('w1'))
    expect(pages.items).toEqual([])
  })

  it('لا يقرر browser قيمة workspaceId أو progressStatus أو role — تصل من المدخل البشري فقط', async () => {
    await writeWorkspace(db, makeWorkspace())

    const result = await addCurrentPageToWorkspace(db, makeClock(2000), makeIds(), capturedTab(), {
      workspaceId: asWorkspaceId('w1'),
      order: 1024,
      progressStatus: 'in-progress',
      role: 'primary',
      reason: 'سبب صريح من المستخدم',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.page.progressStatus).toBe('in-progress')
    expect(result.value.page.role).toBe('primary')
    expect(result.value.page.reason).toBe('سبب صريح من المستخدم')
  })
})

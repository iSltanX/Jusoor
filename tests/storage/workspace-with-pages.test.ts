import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'

import { openDatabase } from '../../src/storage/database'
import { writeWorkspaceWithPages } from '../../src/storage/workspace-with-pages'
import { listPagesByWorkspace } from '../../src/storage/pages'
import { listWorkspaces, readWorkspace } from '../../src/storage/workspaces'
import { asSavedPageId, asWorkspaceId } from '../../src/core/ids'
import type { Workspace } from '../../src/core/workspace'
import type { SavedPage } from '../../src/core/page'

let db: IDBDatabase

beforeEach(async () => {
  db = await openDatabase(new IDBFactory())
})

function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: asWorkspaceId('w1'),
    name: 'مساحة من تبويبات',
    template: 'general',
    status: 'active',
    createdAt: 1000,
    updatedAt: 1000,
    lastWorkedAt: 1000,
    ...overrides,
  }
}

function makePage(overrides: Partial<SavedPage> = {}): SavedPage {
  return {
    id: asSavedPageId('p1'),
    workspaceId: asWorkspaceId('w1'),
    url: 'https://example.com/1',
    title: 'صفحة',
    capturedAt: 1000,
    order: 1024,
    progressStatus: 'not-started',
    notes: [],
    addedAt: 1000,
    updatedAt: 1000,
    ...overrides,
  }
}

describe('writeWorkspaceWithPages — الكتابة الناجحة', () => {
  it('يكتب المساحة وصفحاتها معًا في استدعاء واحد', async () => {
    const workspace = makeWorkspace()
    const pages = [
      makePage({ id: asSavedPageId('a'), order: 1024 }),
      makePage({ id: asSavedPageId('b'), order: 2048 }),
    ]

    const result = await writeWorkspaceWithPages(db, workspace, pages)
    expect(result.ok).toBe(true)

    const readBack = await readWorkspace(db, workspace.id)
    expect(readBack.status).toBe('found')

    const pagesReadBack = await listPagesByWorkspace(db, workspace.id)
    expect(pagesReadBack.items.map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('يعمل مع مساحة بلا صفحات (قائمة فارغة)', async () => {
    const workspace = makeWorkspace()
    const result = await writeWorkspaceWithPages(db, workspace, [])

    expect(result.ok).toBe(true)
    const readBack = await readWorkspace(db, workspace.id)
    expect(readBack.status).toBe('found')
  })
})

describe('writeWorkspaceWithPages — العلاقات الداخلية للدفعة', () => {
  it('يرفض صفحة تحمل workspaceId مختلفًا عن المساحة، ولا يكتب شيئًا', async () => {
    const workspace = makeWorkspace({ id: asWorkspaceId('w1') })
    const pages = [
      makePage({ id: asSavedPageId('mine'), workspaceId: asWorkspaceId('w1') }),
      makePage({ id: asSavedPageId('foreign'), workspaceId: asWorkspaceId('w2'), order: 2048 }),
    ]

    const result = await writeWorkspaceWithPages(db, workspace, pages)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('storage/invalid-write')
      expect(result.details).toBe('page workspaceId mismatch')
    }

    expect((await listWorkspaces(db)).items).toEqual([])
    expect((await listPagesByWorkspace(db, asWorkspaceId('w1'))).items).toEqual([])
    expect((await listPagesByWorkspace(db, asWorkspaceId('w2'))).items).toEqual([])
  })

  it('يرفض معرف صفحة مكررًا داخل الدفعة — لا استبدال صامت عبر put', async () => {
    const workspace = makeWorkspace()
    const pages = [
      makePage({ id: asSavedPageId('same'), url: 'https://example.com/1', order: 1024 }),
      makePage({ id: asSavedPageId('same'), url: 'https://example.com/2', order: 2048 }),
    ]

    const result = await writeWorkspaceWithPages(db, workspace, pages)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('storage/invalid-write')
      expect(result.details).toBe('duplicate page id in batch')
    }

    // لولا هذا التحقق لكُتب سجل واحد فقط، ولاختفت إحدى الصفحتين بلا أثر.
    expect((await listPagesByWorkspace(db, workspace.id)).items).toEqual([])
    expect((await listWorkspaces(db)).items).toEqual([])
  })

  it('يرفض activePageId لا يشير إلى أي صفحة في الدفعة، ولا يكتب شيئًا', async () => {
    const workspace = makeWorkspace({ activePageId: asSavedPageId('ghost') })
    const pages = [makePage({ id: asSavedPageId('a') })]

    const result = await writeWorkspaceWithPages(db, workspace, pages)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('storage/invalid-write')
      expect(result.details).toBe('activePageId not in batch')
    }

    expect((await readWorkspace(db, workspace.id)).status).toBe('not-found')
    expect((await listPagesByWorkspace(db, workspace.id)).items).toEqual([])
  })

  it('يقبل activePageId يشير فعلًا إلى صفحة ضمن الدفعة', async () => {
    const workspace = makeWorkspace({ activePageId: asSavedPageId('b') })
    const pages = [
      makePage({ id: asSavedPageId('a'), order: 1024 }),
      makePage({ id: asSavedPageId('b'), url: 'https://example.com/2', order: 2048 }),
    ]

    const result = await writeWorkspaceWithPages(db, workspace, pages)
    expect(result.ok).toBe(true)

    const readBack = await readWorkspace(db, workspace.id)
    expect(readBack.status).toBe('found')
    if (readBack.status !== 'found') return
    expect(readBack.value.activePageId).toBe('b')
  })

  it('يقبل مساحة بلا activePageId إطلاقًا', async () => {
    const result = await writeWorkspaceWithPages(db, makeWorkspace(), [makePage()])
    expect(result.ok).toBe(true)
  })

  it('لا يفتح معاملة عند فشل تحقق العلاقات — قاعدة مغلقة لا ترمي استثناءً', async () => {
    const workspace = makeWorkspace({ activePageId: asSavedPageId('ghost') })
    const pages = [makePage({ id: asSavedPageId('a') })]

    // إغلاق الاتصال يجعل db.transaction ترمي InvalidStateError فورًا. بلوغ نتيجة
    // StorageResult منظمة رغم ذلك يثبت أن التحقق سبق أي محاولة لفتح معاملة.
    db.close()

    const result = await writeWorkspaceWithPages(db, workspace, pages)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.details).toBe('activePageId not in batch')
  })
})

describe('writeWorkspaceWithPages — رفض التحقق قبل فتح المعاملة', () => {
  it('يرفض إن كانت المساحة غير صالحة، ولا يكتب أي صفحة', async () => {
    const workspace = makeWorkspace({ name: '   ' })
    const pages = [makePage()]

    const result = await writeWorkspaceWithPages(db, workspace, pages)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('storage/invalid-write')

    const allWorkspaces = await listWorkspaces(db)
    expect(allWorkspaces.items).toEqual([])

    const allPages = await listPagesByWorkspace(db, workspace.id)
    expect(allPages.items).toEqual([])
  })

  it('يرفض إن كانت إحدى الصفحات غير صالحة، ولا يكتب المساحة ولا أي صفحة أخرى', async () => {
    const workspace = makeWorkspace()
    const pages = [
      makePage({ id: asSavedPageId('valid'), order: 1024 }),
      makePage({ id: asSavedPageId('invalid'), url: 'ليس رابطًا', order: 2048 }),
    ]

    const result = await writeWorkspaceWithPages(db, workspace, pages)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('storage/invalid-write')

    // لا مساحة فارغة جزئيًا، ولا صفحة صالحة كُتبت وحدها دون بقية الدفعة
    const readBack = await readWorkspace(db, workspace.id)
    expect(readBack.status).toBe('not-found')

    const allPages = await listPagesByWorkspace(db, workspace.id)
    expect(allPages.items).toEqual([])
  })
})

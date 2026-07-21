import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'

import { openDatabase } from '../../src/storage/database'
import { deleteSavedPage, readSavedPage, listPagesByWorkspace, writeSavedPage } from '../../src/storage/pages'
import {
  deleteWorkspaceWithPages,
  readWorkspace,
  writeWorkspace,
} from '../../src/storage/workspaces'
import { asPageNoteId, asSavedPageId, asWorkspaceId } from '../../src/core/ids'
import type { SavedPage } from '../../src/core/page'
import type { Workspace } from '../../src/core/workspace'

/**
 * الحذف النهائي الذرّي — قرار 0018:
 *
 * - حذف الصفحة يزيل سجلها بملاحظاته المضمَّنة، ويمسح `activePageId` إن كان
 *   يشير إليها، ويرفع وقت النشاط — كل ذلك في معاملة واحدة.
 * - حذف المساحة يزيلها بكل صفحاتها، ولا يمس مساحات أخرى — لا بيانات يتيمة.
 * - الفشل صادق: صفحة أو مساحة غائبة تعيد خطأ منظمًا ولا تكتب شيئًا.
 */

let db: IDBDatabase

beforeEach(async () => {
  db = await openDatabase(new IDBFactory())
})

function workspace(overrides: Partial<Workspace> = {}): Workspace {
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

function page(id: string, overrides: Partial<SavedPage> = {}): SavedPage {
  return {
    id: asSavedPageId(id),
    workspaceId: asWorkspaceId('w1'),
    url: `https://example.com/${id}`,
    title: `صفحة ${id}`,
    capturedAt: 1000,
    order: 1024,
    progressStatus: 'not-started',
    notes: [
      { id: asPageNoteId(`${id}-n1`), body: 'ملاحظة', createdAt: 1000, updatedAt: 1000 },
    ],
    addedAt: 1000,
    updatedAt: 1000,
    ...overrides,
  }
}

describe('deleteSavedPage', () => {
  it('يحذف السجل بملاحظاته ويرفع نشاط المساحة ذرّيًا', async () => {
    await writeWorkspace(db, workspace())
    await writeSavedPage(db, page('p1'))
    await writeSavedPage(db, page('p2'))

    const result = await deleteSavedPage(db, asSavedPageId('p1'), { workedAt: 9000 })
    expect(result.ok).toBe(true)

    expect((await readSavedPage(db, asSavedPageId('p1'))).status).toBe('not-found')
    expect((await readSavedPage(db, asSavedPageId('p2'))).status).toBe('found')

    const after = await readWorkspace(db, asWorkspaceId('w1'))
    expect(after.status).toBe('found')
    if (after.status === 'found') {
      expect(after.value.lastWorkedAt).toBe(9000)
      expect(after.value.updatedAt).toBe(9000)
    }
  })

  it('يمسح activePageId حين يشير إلى الصفحة المحذوفة — لا مرجع يتيمًا', async () => {
    await writeWorkspace(db, workspace({ activePageId: asSavedPageId('p1') }))
    await writeSavedPage(db, page('p1'))

    const result = await deleteSavedPage(db, asSavedPageId('p1'), { workedAt: 9000 })
    expect(result.ok).toBe(true)

    const after = await readWorkspace(db, asWorkspaceId('w1'))
    if (after.status === 'found') {
      expect(after.value.activePageId).toBeUndefined()
    }
  })

  it('يبقي activePageId حين يشير إلى صفحة أخرى', async () => {
    await writeWorkspace(db, workspace({ activePageId: asSavedPageId('p2') }))
    await writeSavedPage(db, page('p1'))
    await writeSavedPage(db, page('p2'))

    await deleteSavedPage(db, asSavedPageId('p1'), { workedAt: 9000 })

    const after = await readWorkspace(db, asWorkspaceId('w1'))
    if (after.status === 'found') {
      expect(after.value.activePageId).toBe(asSavedPageId('p2'))
    }
  })

  it('صفحة غائبة: خطأ منظم ولا كتابة', async () => {
    await writeWorkspace(db, workspace())

    const result = await deleteSavedPage(db, asSavedPageId('missing'), { workedAt: 9000 })
    expect(result.ok).toBe(false)

    const after = await readWorkspace(db, asWorkspaceId('w1'))
    if (after.status === 'found') {
      // لا رفع نشاط لعملية لم تقع
      expect(after.value.lastWorkedAt).toBe(1000)
    }
  })
})

describe('deleteWorkspaceWithPages', () => {
  it('يحذف المساحة وكل صفحاتها ولا يمس مساحة أخرى', async () => {
    await writeWorkspace(db, workspace())
    await writeWorkspace(db, workspace({ id: asWorkspaceId('w2'), name: 'أخرى' }))
    await writeSavedPage(db, page('p1'))
    await writeSavedPage(db, page('p2'))
    await writeSavedPage(db, page('x1', { workspaceId: asWorkspaceId('w2') }))

    const result = await deleteWorkspaceWithPages(db, asWorkspaceId('w1'))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.deletedPages).toBe(2)

    expect((await readWorkspace(db, asWorkspaceId('w1'))).status).toBe('not-found')
    expect((await readSavedPage(db, asSavedPageId('p1'))).status).toBe('not-found')
    expect((await readSavedPage(db, asSavedPageId('p2'))).status).toBe('not-found')

    // المساحة الأخرى وصفحتها سليمتان
    expect((await readWorkspace(db, asWorkspaceId('w2'))).status).toBe('found')
    const others = await listPagesByWorkspace(db, asWorkspaceId('w2'))
    expect(others.items.map((item) => item.id)).toEqual([asSavedPageId('x1')])
  })

  it('لا صفحات يتيمة بعد الحذف — فهرس المساحة يعود فارغًا', async () => {
    await writeWorkspace(db, workspace())
    await writeSavedPage(db, page('p1'))

    await deleteWorkspaceWithPages(db, asWorkspaceId('w1'))

    const orphans = await listPagesByWorkspace(db, asWorkspaceId('w1'))
    expect(orphans.items).toEqual([])
    expect(orphans.corrupted).toEqual([])
  })

  it('مساحة غائبة: خطأ منظم ولا حذف لغيرها', async () => {
    await writeWorkspace(db, workspace({ id: asWorkspaceId('w2') }))
    await writeSavedPage(db, page('x1', { workspaceId: asWorkspaceId('w2') }))

    const result = await deleteWorkspaceWithPages(db, asWorkspaceId('missing'))
    expect(result.ok).toBe(false)

    expect((await readSavedPage(db, asSavedPageId('x1'))).status).toBe('found')
  })
})

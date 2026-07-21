import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'

import { openDatabase } from '../../src/storage/database'
import { readWorkspace, writeWorkspace } from '../../src/storage/workspaces'
import { writeSavedPage } from '../../src/storage/pages'
import { addPage, reorderPages, updatePage } from '../../src/app/pages'
import { addNote, deleteNote, updateNote } from '../../src/app/notes'
import {
  freezeWorkspaceState,
  reactivateWorkspace,
  updateCheckpoint,
  updateWorkspace,
} from '../../src/app/workspaces'
import type { Clock } from '../../src/app/clock'
import type { IdGenerator } from '../../src/app/ids'
import { asPageNoteId, asSavedPageId, asWorkspaceId } from '../../src/core/ids'
import type { Workspace } from '../../src/core/workspace'
import type { SavedPage } from '../../src/core/page'

/**
 * `lastWorkedAt` يميّز «عمل مقصود على المهمة» عن «أي تغيير في سجل» — قرار 0009
 * وجدوله التوضيحي. الاختبارات هنا موجبة وسالبة معًا: إثبات أنه يرتفع حيث يجب
 * لا يكفي ما لم يُثبَت أنه **لا يرتفع** حيث لا يجب، وإلا صار ختمًا على كل كتابة.
 */

const SEEDED = 1_000
const WORKED = 9_000

let db: IDBDatabase

beforeEach(async () => {
  db = await openDatabase(new IDBFactory())
  await writeWorkspace(db, makeWorkspace())
})

function makeClock(time: number): Clock {
  return { now: () => time }
}

function makeIds(prefix = 'gen'): IdGenerator {
  let counter = 0
  return {
    workspaceId: () => asWorkspaceId(`${prefix}-w-${String(++counter)}`),
    savedPageId: () => asSavedPageId(`${prefix}-p-${String(++counter)}`),
    pageNoteId: () => asPageNoteId(`${prefix}-n-${String(++counter)}`),
  }
}

function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: asWorkspaceId('w1'),
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
    workspaceId: asWorkspaceId('w1'),
    url: 'https://example.com/docs',
    title: 'عنوان',
    capturedAt: SEEDED,
    order: 1024,
    progressStatus: 'not-started',
    notes: [],
    addedAt: SEEDED,
    updatedAt: SEEDED,
    ...overrides,
  }
}

async function readLastWorkedAt(): Promise<number> {
  const result = await readWorkspace(db, asWorkspaceId('w1'))
  if (result.status !== 'found') throw new Error('المساحة غير موجودة')
  return result.value.lastWorkedAt
}

// ===== يرتفع: عمل مقصود على المهمة =====

describe('يرتفع عند العمل المقصود', () => {
  it('إضافة صفحة', async () => {
    await addPage(db, makeClock(WORKED), makeIds(), {
      workspaceId: asWorkspaceId('w1'),
      title: 'عنوان',
      url: 'https://example.com/new',
      order: 1024,
    })

    expect(await readLastWorkedAt()).toBe(WORKED)
  })

  it('تعديل صفحة', async () => {
    await writeSavedPage(db, makePage())

    await updatePage(db, makeClock(WORKED), asSavedPageId('p1'), { title: 'عنوان محدَّث' })

    expect(await readLastWorkedAt()).toBe(WORKED)
  })

  it('إعادة ترتيب الصفحات', async () => {
    await writeSavedPage(db, makePage())

    await reorderPages(db, makeClock(WORKED), asWorkspaceId('w1'), [
      { pageId: asSavedPageId('p1'), order: 2048 },
    ])

    expect(await readLastWorkedAt()).toBe(WORKED)
  })

  it('إضافة ملاحظة', async () => {
    await writeSavedPage(db, makePage())

    await addNote(db, makeClock(WORKED), makeIds(), {
      savedPageId: asSavedPageId('p1'),
      body: 'ملاحظة',
    })

    expect(await readLastWorkedAt()).toBe(WORKED)
  })

  it('تعديل ملاحظة', async () => {
    await writeSavedPage(
      db,
      makePage({ notes: [{ id: asPageNoteId('n1'), body: 'قديم', createdAt: 1, updatedAt: 1 }] }),
    )

    await updateNote(db, makeClock(WORKED), {
      savedPageId: asSavedPageId('p1'),
      noteId: asPageNoteId('n1'),
      body: 'جديد',
    })

    expect(await readLastWorkedAt()).toBe(WORKED)
  })

  it('حذف ملاحظة', async () => {
    await writeSavedPage(
      db,
      makePage({ notes: [{ id: asPageNoteId('n1'), body: 'نص', createdAt: 1, updatedAt: 1 }] }),
    )

    await deleteNote(db, makeClock(WORKED), {
      savedPageId: asSavedPageId('p1'),
      noteId: asPageNoteId('n1'),
    })

    expect(await readLastWorkedAt()).toBe(WORKED)
  })

  it('الملاحظة العامة للمساحة', async () => {
    await updateWorkspace(db, makeClock(WORKED), asWorkspaceId('w1'), {
      generalNote: 'ملاحظة عامة',
    })

    expect(await readLastWorkedAt()).toBe(WORKED)
  })

  it('نقطة التوقف والخطوة التالية', async () => {
    await updateCheckpoint(db, makeClock(WORKED), asWorkspaceId('w1'), {
      lastReached: 'وصلت هنا',
    })

    expect(await readLastWorkedAt()).toBe(WORKED)
  })

  it('التجميد', async () => {
    await freezeWorkspaceState(db, makeClock(WORKED), asWorkspaceId('w1'))

    expect(await readLastWorkedAt()).toBe(WORKED)
  })

  it('إعادة التنشيط', async () => {
    await writeWorkspace(db, makeWorkspace({ status: 'frozen', frozenAt: SEEDED }))

    await reactivateWorkspace(db, makeClock(WORKED), asWorkspaceId('w1'))

    expect(await readLastWorkedAt()).toBe(WORKED)
  })
})

// ===== لا يرتفع: ليس عملًا على المهمة =====

describe('لا يرتفع حيث لا يجب', () => {
  it('تحرير اسم المساحة — ضبط إطار لا عمل', async () => {
    const result = await updateWorkspace(db, makeClock(WORKED), asWorkspaceId('w1'), {
      name: 'اسم جديد',
    })

    expect(result.ok).toBe(true)
    expect(await readLastWorkedAt()).toBe(SEEDED)
  })

  it('تحرير هدف المساحة', async () => {
    await updateWorkspace(db, makeClock(WORKED), asWorkspaceId('w1'), { goal: 'هدف جديد' })

    expect(await readLastWorkedAt()).toBe(SEEDED)
  })

  it('تحرير وصف المساحة', async () => {
    await updateWorkspace(db, makeClock(WORKED), asWorkspaceId('w1'), { description: 'وصف' })

    expect(await readLastWorkedAt()).toBe(SEEDED)
  })

  it('تحرير الاسم يرفع updatedAt وحده لا lastWorkedAt', async () => {
    const result = await updateWorkspace(db, makeClock(WORKED), asWorkspaceId('w1'), {
      name: 'اسم جديد',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.updatedAt).toBe(WORKED)
    expect(result.value.lastWorkedAt).toBe(SEEDED)
  })

  it('تعارض تكرار ينتظر قرار المستخدم — لا كتابة ولا رفع', async () => {
    await writeSavedPage(db, makePage())
    const before = await readLastWorkedAt()

    const result = await addPage(db, makeClock(WORKED), makeIds(), {
      workspaceId: asWorkspaceId('w1'),
      title: 'نسخة',
      url: 'https://example.com/docs',
      order: 2048,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.saved).toBe(false)
    expect(await readLastWorkedAt()).toBe(before)
  })

  it('تعديل صفحة بلا تغيير فعلي — لا كتابة ولا رفع', async () => {
    await writeSavedPage(db, makePage({ title: 'نفسه' }))

    await updatePage(db, makeClock(WORKED), asSavedPageId('p1'), { title: 'نفسه' })

    expect(await readLastWorkedAt()).toBe(SEEDED)
  })

  it('تعديل ملاحظة بنصها نفسه — لا كتابة ولا رفع', async () => {
    await writeSavedPage(
      db,
      makePage({ notes: [{ id: asPageNoteId('n1'), body: 'نفسه', createdAt: 1, updatedAt: 1 }] }),
    )

    await updateNote(db, makeClock(WORKED), {
      savedPageId: asSavedPageId('p1'),
      noteId: asPageNoteId('n1'),
      body: 'نفسه',
    })

    expect(await readLastWorkedAt()).toBe(SEEDED)
  })

  it('مجرد القراءة لا يمس شيئًا', async () => {
    await readWorkspace(db, asWorkspaceId('w1'))

    expect(await readLastWorkedAt()).toBe(SEEDED)
  })
})

// ===== الذرّية =====

describe('ذرّية رفع وقت النشاط', () => {
  it('فشل رفع وقت النشاط يمنع كتابة الصفحة أيضًا — لا نصف عملية', async () => {
    // صفحة تشير إلى مساحة غير موجودة: الكتابة تنجح بنيويًا، لكن رفع النشاط
    // يفشل لغياب المساحة، فتُجهض المعاملة كلها ولا تُكتب الصفحة.
    const orphan = makePage({ id: asSavedPageId('orphan'), workspaceId: asWorkspaceId('ghost') })

    const result = await writeSavedPage(db, orphan, { workedAt: WORKED })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('storage/invalid-write')
    expect(result.details).toBe('workspace not found')

    const { readSavedPage } = await import('../../src/storage/pages')
    expect((await readSavedPage(db, asSavedPageId('orphan'))).status).toBe('not-found')
  })

  it('بلا workedAt تُكتب الصفحة ولا يتغيّر وقت النشاط', async () => {
    const result = await writeSavedPage(db, makePage())

    expect(result.ok).toBe(true)
    expect(await readLastWorkedAt()).toBe(SEEDED)
  })
})

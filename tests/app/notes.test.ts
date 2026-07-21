import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'

import { openDatabase } from '../../src/storage/database'
import { readSavedPage, writeSavedPage } from '../../src/storage/pages'
import { writeWorkspace } from '../../src/storage/workspaces'
import { addNote, deleteNote, updateNote } from '../../src/app/notes'
import type { Clock } from '../../src/app/clock'
import type { IdGenerator } from '../../src/app/ids'
import { asPageNoteId, asSavedPageId, asWorkspaceId } from '../../src/core/ids'
import type { SavedPage } from '../../src/core/page'

let db: IDBDatabase

beforeEach(async () => {
  db = await openDatabase(new IDBFactory())
  // «لا صفحة بلا مساحة» (core/page.ts): كتابة الصفحات ترفع وقت نشاط مساحتها،
  // فالمساحة الأم جزء من الحالة الابتدائية الواقعية لا تفصيل اختياري.
  await writeWorkspace(db, {
    id: asWorkspaceId('w1'),
    name: 'مساحة',
    template: 'general',
    status: 'active',
    createdAt: 1000,
    updatedAt: 1000,
    lastWorkedAt: 1000,
  })
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

function makePage(overrides: Partial<SavedPage> = {}): SavedPage {
  return {
    id: asSavedPageId('p1'),
    workspaceId: asWorkspaceId('w1'),
    url: 'https://example.com/docs',
    title: 'عنوان',
    capturedAt: 1000,
    order: 1024,
    progressStatus: 'not-started',
    notes: [],
    addedAt: 1000,
    updatedAt: 1000,
    ...overrides,
  }
}

describe('addNote', () => {
  it('يضيف ملاحظة إلى صفحة موجودة', async () => {
    await writeSavedPage(db, makePage())
    const result = await addNote(db, makeClock(2000), makeIds(), {
      savedPageId: asSavedPageId('p1'),
      body: 'ملاحظة جديدة',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.body).toBe('ملاحظة جديدة')
  })

  it('يرفض صفحة غير موجودة', async () => {
    const result = await addNote(db, makeClock(), makeIds(), {
      savedPageId: asSavedPageId('ghost'),
      body: 'نص',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'not-found', entity: 'saved-page' })
  })

  it('يرفض نصًا فارغًا', async () => {
    await writeSavedPage(db, makePage())
    const result = await addNote(db, makeClock(), makeIds(), {
      savedPageId: asSavedPageId('p1'),
      body: '   ',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'invalid-input', field: 'body' })
  })

  it('يستخدم id ووقتًا محقونين لا حقيقيين', async () => {
    await writeSavedPage(db, makePage())
    const result = await addNote(db, makeClock(42424), makeIds('fixed'), {
      savedPageId: asSavedPageId('p1'),
      body: 'نص',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.id).toBe('fixed-note-1')
    expect(result.value.createdAt).toBe(42424)
    expect(result.value.updatedAt).toBe(42424)
  })

  it('لا يفقد الملاحظات الأخرى الموجودة مسبقًا على نفس الصفحة', async () => {
    await writeSavedPage(
      db,
      makePage({ notes: [{ id: asPageNoteId('existing'), body: 'قديمة', createdAt: 1, updatedAt: 1 }] }),
    )

    await addNote(db, makeClock(2000), makeIds(), { savedPageId: asSavedPageId('p1'), body: 'جديدة' })

    const page = await readSavedPage(db, asSavedPageId('p1'))
    expect(page.status).toBe('found')
    if (page.status !== 'found') return
    expect(page.value.notes.map((n) => n.id).sort()).toEqual(['existing', 'gen-note-1'].sort())
  })
})

describe('updateNote', () => {
  it('يحدّث النص والوقت فقط', async () => {
    await writeSavedPage(
      db,
      makePage({ notes: [{ id: asPageNoteId('n1'), body: 'قديم', createdAt: 1000, updatedAt: 1000 }] }),
    )

    const result = await updateNote(db, makeClock(5000), {
      savedPageId: asSavedPageId('p1'),
      noteId: asPageNoteId('n1'),
      body: 'جديد',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.body).toBe('جديد')
    expect(result.value.updatedAt).toBe(5000)
    expect(result.value.createdAt).toBe(1000)
  })

  it('لا يغيّر id الملاحظة', async () => {
    await writeSavedPage(
      db,
      makePage({ notes: [{ id: asPageNoteId('n1'), body: 'قديم', createdAt: 1000, updatedAt: 1000 }] }),
    )

    const result = await updateNote(db, makeClock(5000), {
      savedPageId: asSavedPageId('p1'),
      noteId: asPageNoteId('n1'),
      body: 'جديد',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.id).toBe('n1')
  })

  it('يعيد not-found لملاحظة غير موجودة ضمن صفحة قائمة', async () => {
    await writeSavedPage(db, makePage())
    const result = await updateNote(db, makeClock(), {
      savedPageId: asSavedPageId('p1'),
      noteId: asPageNoteId('ghost'),
      body: 'نص',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'not-found', entity: 'page-note' })
  })

  it('يعيد not-found لصفحة غير موجودة', async () => {
    const result = await updateNote(db, makeClock(), {
      savedPageId: asSavedPageId('ghost'),
      noteId: asPageNoteId('n1'),
      body: 'نص',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'not-found', entity: 'page-note' })
  })

  it('لا يكتب شيئًا إن كان النص نفسه — updatedAt يبقى كما هو', async () => {
    await writeSavedPage(
      db,
      makePage({ notes: [{ id: asPageNoteId('n1'), body: 'نفسه', createdAt: 1000, updatedAt: 1000 }] }),
    )

    const result = await updateNote(db, makeClock(9999), {
      savedPageId: asSavedPageId('p1'),
      noteId: asPageNoteId('n1'),
      body: 'نفسه',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.updatedAt).toBe(1000)
  })

  it('يرفض نصًا فارغًا', async () => {
    await writeSavedPage(
      db,
      makePage({ notes: [{ id: asPageNoteId('n1'), body: 'قديم', createdAt: 1000, updatedAt: 1000 }] }),
    )

    const result = await updateNote(db, makeClock(), {
      savedPageId: asSavedPageId('p1'),
      noteId: asPageNoteId('n1'),
      body: '   ',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'invalid-input', field: 'body' })
  })
})

describe('deleteNote', () => {
  it('يحذف ملاحظة واحدة فقط ولا يمس ملاحظات أخرى على نفس الصفحة', async () => {
    await writeSavedPage(
      db,
      makePage({
        notes: [
          { id: asPageNoteId('keep'), body: 'تبقى', createdAt: 1, updatedAt: 1 },
          { id: asPageNoteId('remove'), body: 'تُحذف', createdAt: 1, updatedAt: 1 },
        ],
      }),
    )

    const result = await deleteNote(db, makeClock(3000), { savedPageId: asSavedPageId('p1'), noteId: asPageNoteId('remove') })
    expect(result.ok).toBe(true)

    const page = await readSavedPage(db, asSavedPageId('p1'))
    expect(page.status).toBe('found')
    if (page.status !== 'found') return
    expect(page.value.notes.map((n) => n.id)).toEqual(['keep'])
  })

  it('يعيد not-found لمحاولة حذف ملاحظة غير موجودة', async () => {
    await writeSavedPage(db, makePage())
    const result = await deleteNote(db, makeClock(3000), { savedPageId: asSavedPageId('p1'), noteId: asPageNoteId('ghost') })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'not-found', entity: 'page-note' })
  })

  it('الصفحة نفسها لا تُحذف — تبقى موجودة بباقي حقولها سليمة بعد حذف ملاحظتها الوحيدة', async () => {
    await writeSavedPage(
      db,
      makePage({ title: 'عنوان الصفحة', notes: [{ id: asPageNoteId('n1'), body: 'وحيدة', createdAt: 1, updatedAt: 1 }] }),
    )

    await deleteNote(db, makeClock(3000), { savedPageId: asSavedPageId('p1'), noteId: asPageNoteId('n1') })

    const page = await readSavedPage(db, asSavedPageId('p1'))
    expect(page.status).toBe('found')
    if (page.status !== 'found') return
    expect(page.value.title).toBe('عنوان الصفحة')
    expect(page.value.notes).toEqual([])
  })
})

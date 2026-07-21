import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'

import { openDatabase, SAVED_PAGES_STORE } from '../../src/storage/database'
import {
  findPagesByNormalizedUrl,
  listPageNotes,
  listPagesByWorkspace,
  parseSavedPageRecord,
  readPageNote,
  readSavedPage,
  writePageNote,
  writeSavedPage,
} from '../../src/storage/pages'
import { asPageNoteId, asSavedPageId, asWorkspaceId } from '../../src/core/ids'
import type { SavedPage, PageNote } from '../../src/core/page'

let db: IDBDatabase

beforeEach(async () => {
  db = await openDatabase(new IDBFactory())
})

function makePage(overrides: Partial<SavedPage> = {}): SavedPage {
  return {
    id: asSavedPageId('p1'),
    workspaceId: asWorkspaceId('w1'),
    url: 'https://example.com/docs',
    title: 'عنوان الصفحة',
    capturedAt: 1000,
    order: 1024,
    progressStatus: 'not-started',
    notes: [],
    addedAt: 1000,
    updatedAt: 1000,
    ...overrides,
  }
}

function makeNote(overrides: Partial<PageNote> = {}): PageNote {
  return {
    id: asPageNoteId('n1'),
    body: 'التعريف أوسع من CCPA',
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  }
}

async function putRaw(record: unknown): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(SAVED_PAGES_STORE, 'readwrite')
    transaction.objectStore(SAVED_PAGES_STORE).put(record)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('failed'))
  })
}

describe('round-trip SavedPage', () => {
  it('يحفظ صفحة ويقرؤها بكل حقولها الاختيارية والملاحظات المضمَّنة سليمة', async () => {
    const page = makePage({
      faviconUrl: 'https://example.com/favicon.ico',
      reason: 'التحقق من اختلاف النطاق',
      role: 'primary',
      labels: ['مهمة', 'أعود لاحقًا'],
      notes: [makeNote()],
    })

    const written = await writeSavedPage(db, page)
    expect(written.ok).toBe(true)

    const result = await readSavedPage(db, page.id)
    expect(result.status).toBe('found')
    if (result.status !== 'found') return
    expect(result.value).toEqual(page)
  })

  it('يحدّث صفحة قائمة بنفس المعرف دون تكرار', async () => {
    const page = makePage()
    await writeSavedPage(db, page)
    await writeSavedPage(db, { ...page, title: 'عنوان محدَّث' })

    const all = await listPagesByWorkspace(db, page.workspaceId)
    expect(all.items).toHaveLength(1)
    expect(all.items[0]?.title).toBe('عنوان محدَّث')
  })

  it('يحفظ الرابط الأصلي حرفيًا دون أي تعديل، رغم أن تطبيعه سيغيّره', async () => {
    const page = makePage({ url: 'HTTPS://WWW.Example.com/Docs/' })
    await writeSavedPage(db, page)

    const result = await readSavedPage(db, page.id)
    expect(result.status).toBe('found')
    if (result.status !== 'found') return
    // الرابط يبقى حرفيًا كما أُدخل، رغم أن normalizeUrlForComparison كان سيغيّره
    expect(result.value.url).toBe('HTTPS://WWW.Example.com/Docs/')
  })
})

describe('رفض الكتابة غير الصالحة', () => {
  it('يرفض رابطًا غير صالح', async () => {
    const result = await writeSavedPage(db, makePage({ url: 'ليس رابطًا' }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('storage/invalid-write')
  })

  it('يرفض order سالبًا', async () => {
    const result = await writeSavedPage(db, makePage({ order: -1 }))
    expect(result.ok).toBe(false)
  })

  it('يرفض ملاحظة بنص فارغ ضمن الصفحة', async () => {
    const result = await writeSavedPage(db, makePage({ notes: [makeNote({ body: '   ' })] }))
    expect(result.ok).toBe(false)
  })

  it('لا يكتب شيئًا فعليًا عند رفض التحقق', async () => {
    await writeSavedPage(db, makePage({ url: 'invalid' }))
    const all = await listPagesByWorkspace(db, asWorkspaceId('w1'))
    expect(all).toEqual({ items: [], corrupted: [] })
  })
})

describe('رفض أو الإبلاغ عن السجلات التالفة', () => {
  it('يرفض سجلًا بمعرف فارغ', async () => {
    await putRaw({ id: '', workspaceId: 'w1', url: 'https://example.com', title: 't', capturedAt: 1, order: 0, progressStatus: 'not-started', notes: [], addedAt: 1, updatedAt: 1 })
    expect(parseSavedPageRecord({ id: '', workspaceId: 'w1' }).ok).toBe(false)
  })

  it('يرفض workspaceId مفقودًا', async () => {
    await putRaw({ id: 'p1', url: 'https://example.com', title: 't', capturedAt: 1, order: 0, progressStatus: 'not-started', notes: [], addedAt: 1, updatedAt: 1 })
    const result = await readSavedPage(db, asSavedPageId('p1'))
    expect(result.status).toBe('corrupt')
  })

  it('يرفض رابطًا غير صالح عند القراءة', async () => {
    await putRaw({ id: 'p1', workspaceId: 'w1', url: 'not a url', title: 't', capturedAt: 1, order: 0, progressStatus: 'not-started', notes: [], addedAt: 1, updatedAt: 1 })
    const result = await readSavedPage(db, asSavedPageId('p1'))
    expect(result.status).toBe('corrupt')
  })

  it('يرفض progressStatus غير معروف', async () => {
    await putRaw({ id: 'p1', workspaceId: 'w1', url: 'https://example.com', title: 't', capturedAt: 1, order: 0, progressStatus: 'unknown', notes: [], addedAt: 1, updatedAt: 1 })
    const result = await readSavedPage(db, asSavedPageId('p1'))
    expect(result.status).toBe('corrupt')
  })

  it('يرفض role غير معروف', async () => {
    await putRaw({ id: 'p1', workspaceId: 'w1', url: 'https://example.com', title: 't', capturedAt: 1, order: 0, progressStatus: 'not-started', role: 'secondary', notes: [], addedAt: 1, updatedAt: 1 })
    const result = await readSavedPage(db, asSavedPageId('p1'))
    expect(result.status).toBe('corrupt')
  })

  it('يرفض order غير صالح (سالبًا)', async () => {
    await putRaw({ id: 'p1', workspaceId: 'w1', url: 'https://example.com', title: 't', capturedAt: 1, order: -5, progressStatus: 'not-started', notes: [], addedAt: 1, updatedAt: 1 })
    const result = await readSavedPage(db, asSavedPageId('p1'))
    expect(result.status).toBe('corrupt')
  })

  it('يرفض timestamp غير صالح', async () => {
    await putRaw({ id: 'p1', workspaceId: 'w1', url: 'https://example.com', title: 't', capturedAt: 'now', order: 0, progressStatus: 'not-started', notes: [], addedAt: 1, updatedAt: 1 })
    const result = await readSavedPage(db, asSavedPageId('p1'))
    expect(result.status).toBe('corrupt')
  })

  it('يرفض الصفحة كاملة إن كانت إحدى ملاحظاتها المضمَّنة تالفة، ولا يُسقطها صامتًا', async () => {
    await putRaw({
      id: 'p1', workspaceId: 'w1', url: 'https://example.com', title: 't', capturedAt: 1,
      order: 0, progressStatus: 'not-started', addedAt: 1, updatedAt: 1,
      notes: [{ id: 'n1', body: '', createdAt: 1, updatedAt: 1 }],
    })
    const result = await readSavedPage(db, asSavedPageId('p1'))
    expect(result.status).toBe('corrupt')
  })

  it('يرفض notes غير مصفوفة', async () => {
    await putRaw({ id: 'p1', workspaceId: 'w1', url: 'https://example.com', title: 't', capturedAt: 1, order: 0, progressStatus: 'not-started', notes: 'not-an-array', addedAt: 1, updatedAt: 1 })
    const result = await readSavedPage(db, asSavedPageId('p1'))
    expect(result.status).toBe('corrupt')
  })

  it('listPagesByWorkspace: السجلات الصالحة تبقى في items رغم وجود سجل تالف', async () => {
    await writeSavedPage(db, makePage({ id: asSavedPageId('valid') }))
    await putRaw({ id: 'corrupt', workspaceId: 'w1', url: 'bad url', title: 't', capturedAt: 1, order: 0, progressStatus: 'not-started', notes: [], addedAt: 1, updatedAt: 1 })

    const all = await listPagesByWorkspace(db, asWorkspaceId('w1'))
    expect(all.items).toHaveLength(1)
    expect(all.items[0]?.id).toBe('valid')
  })

  it('listPagesByWorkspace: السجل التالف لا يختفي صامتًا — يظهر في corrupted', async () => {
    await putRaw({ id: 'corrupt', workspaceId: 'w1', url: 'bad url', title: 't', capturedAt: 1, order: 0, progressStatus: 'not-started', notes: [], addedAt: 1, updatedAt: 1 })

    const all = await listPagesByWorkspace(db, asWorkspaceId('w1'))
    expect(all.corrupted).toHaveLength(1)
    expect(all.corrupted[0]?.store).toBe('savedPages')
    expect(all.corrupted[0]?.key).toBe('corrupt')
    expect(all.corrupted[0]?.details).toBe('url')
    expect(all.items.some((p) => p.id === 'corrupt')).toBe(false)
  })

  it('findPagesByNormalizedUrl: سجل تالف داخل المساحة يظهر في corrupted لا يختفي', async () => {
    await putRaw({ id: 'corrupt', workspaceId: 'w1', url: 'bad url', title: 't', capturedAt: 1, order: 0, progressStatus: 'not-started', notes: [], addedAt: 1, updatedAt: 1 })

    const result = await findPagesByNormalizedUrl(db, asWorkspaceId('w1'), 'https://example.com/docs')
    expect(result.items).toEqual([])
    expect(result.corrupted).toHaveLength(1)
    expect(result.corrupted[0]?.key).toBe('corrupt')
  })
})

describe('ترتيب صفحات المساحة', () => {
  it('يرتب حسب order تصاعديًا بصورة حتمية', async () => {
    await writeSavedPage(db, makePage({ id: asSavedPageId('b'), order: 2048 }))
    await writeSavedPage(db, makePage({ id: asSavedPageId('a'), order: 1024 }))

    const all = await listPagesByWorkspace(db, asWorkspaceId('w1'))
    expect(all.items.map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('يحسم تعادل order بـ addedAt ثم id بلا تعديل قيم المستخدم', async () => {
    await writeSavedPage(db, makePage({ id: asSavedPageId('later'), order: 1024, addedAt: 2000 }))
    await writeSavedPage(db, makePage({ id: asSavedPageId('earlier'), order: 1024, addedAt: 1000 }))

    const all = await listPagesByWorkspace(db, asWorkspaceId('w1'))
    expect(all.items.map((p) => p.id)).toEqual(['earlier', 'later'])
    // order وaddedAt الأصليان لم يتغيرا بفعل الفرز
    expect(all.items[0]?.order).toBe(1024)
    expect(all.items[0]?.addedAt).toBe(1000)
  })

  it('لا يخلط صفحات مساحات أخرى في النتيجة', async () => {
    await writeSavedPage(db, makePage({ id: asSavedPageId('p1'), workspaceId: asWorkspaceId('w1') }))
    await writeSavedPage(db, makePage({ id: asSavedPageId('p2'), workspaceId: asWorkspaceId('w2') }))

    const w1Pages = await listPagesByWorkspace(db, asWorkspaceId('w1'))
    expect(w1Pages.items.map((p) => p.id)).toEqual(['p1'])
  })
})

describe('findPagesByNormalizedUrl — اكتشاف تكرار، لا دمج ولا حذف', () => {
  it('يجد صفحة تتطابق بعد إزالة معلمات التتبع فقط', async () => {
    const page = makePage({ url: 'https://example.com/docs?utm_source=newsletter' })
    await writeSavedPage(db, page)

    const matches = await findPagesByNormalizedUrl(
      db,
      asWorkspaceId('w1'),
      'https://example.com/docs',
    )
    expect(matches.items.map((p) => p.id)).toEqual(['p1'])
  })

  it('لا يوحّد http مع https — لا يُعامَلان تطابقًا', async () => {
    await writeSavedPage(db, makePage({ id: asSavedPageId('http-page'), url: 'http://example.com/docs' }))

    const matches = await findPagesByNormalizedUrl(
      db,
      asWorkspaceId('w1'),
      'https://example.com/docs',
    )
    expect(matches.items).toEqual([])
  })

  it('لا يحذف www. — لا يُعامَل مع عدمه تطابقًا', async () => {
    await writeSavedPage(db, makePage({ id: asSavedPageId('www-page'), url: 'https://www.example.com/docs' }))

    const matches = await findPagesByNormalizedUrl(
      db,
      asWorkspaceId('w1'),
      'https://example.com/docs',
    )
    expect(matches.items).toEqual([])
  })

  it('حصر الاكتشاف داخل مساحة واحدة: الرابط نفسه في مساحتين لا يُعامَل سجلًا عالميًا', async () => {
    await writeSavedPage(db, makePage({ id: asSavedPageId('in-w1'), workspaceId: asWorkspaceId('w1') }))
    await writeSavedPage(db, makePage({ id: asSavedPageId('in-w2'), workspaceId: asWorkspaceId('w2'), url: 'https://example.com/docs' }))

    const matchesInW1 = await findPagesByNormalizedUrl(db, asWorkspaceId('w1'), 'https://example.com/docs')
    expect(matchesInW1.items.map((p) => p.id)).toEqual(['in-w1'])

    const matchesInW2 = await findPagesByNormalizedUrl(db, asWorkspaceId('w2'), 'https://example.com/docs')
    expect(matchesInW2.items.map((p) => p.id)).toEqual(['in-w2'])
  })

  it('التطابق لا يحذف ولا يدمج شيئًا — كلا السجلين يبقيان سليمين بعد الاستدعاء', async () => {
    const first = makePage({ id: asSavedPageId('p1'), url: 'https://example.com/docs' })
    const second = makePage({
      id: asSavedPageId('p2'),
      url: 'https://example.com/docs?utm_source=x',
      order: 2048,
    })
    await writeSavedPage(db, first)
    await writeSavedPage(db, second)

    const matches = await findPagesByNormalizedUrl(db, asWorkspaceId('w1'), first.url)
    expect(matches.items.map((p) => p.id).sort()).toEqual(['p1', 'p2'])

    // بعد الاستدعاء، كلا السجلين ما زالا موجودين بروابطهما الأصلية المتمايزة —
    // لا حذف تلقائي ولا دمج، والقرار بشأنهما يبقى خارج هذه الدالة تمامًا.
    const stillFirst = await readSavedPage(db, first.id)
    const stillSecond = await readSavedPage(db, second.id)
    expect(stillFirst.status).toBe('found')
    expect(stillSecond.status).toBe('found')
    if (stillFirst.status === 'found') expect(stillFirst.value.url).toBe(first.url)
    if (stillSecond.status === 'found') expect(stillSecond.value.url).toBe(second.url)
  })

  it('بلا تطابق يعيد قائمة فارغة', async () => {
    await writeSavedPage(db, makePage({ url: 'https://example.com/other-page' }))
    const matches = await findPagesByNormalizedUrl(db, asWorkspaceId('w1'), 'https://example.com/docs')
    expect(matches).toEqual({ items: [], corrupted: [] })
  })
})

describe('round-trip PageNote', () => {
  it('يحفظ ملاحظة جديدة ضمن صفحة ويقرؤها بمعرفها', async () => {
    await writeSavedPage(db, makePage())

    const note = makeNote()
    const written = await writePageNote(db, asSavedPageId('p1'), note)
    expect(written.ok).toBe(true)

    const result = await readPageNote(db, asSavedPageId('p1'), note.id)
    expect(result.status).toBe('found')
    if (result.status !== 'found') return
    expect(result.value).toEqual(note)
  })

  it('يحدّث ملاحظة قائمة بنفس المعرف دون تكرارها', async () => {
    await writeSavedPage(db, makePage())
    await writePageNote(db, asSavedPageId('p1'), makeNote())
    await writePageNote(db, asSavedPageId('p1'), makeNote({ body: 'نص محدَّث' }))

    const notes = await listPageNotes(db, asSavedPageId('p1'))
    expect(notes.items).toHaveLength(1)
    expect(notes.items[0]?.body).toBe('نص محدَّث')
  })

  it('لا يغيّر SavedPage.updatedAt عند إضافة ملاحظة — ضبط النشاط قرار حالة استخدام', async () => {
    await writeSavedPage(db, makePage({ updatedAt: 1000 }))
    await writePageNote(db, asSavedPageId('p1'), makeNote())

    const page = await readSavedPage(db, asSavedPageId('p1'))
    expect(page.status).toBe('found')
    if (page.status === 'found') expect(page.value.updatedAt).toBe(1000)
  })

  it('يرفض ملاحظة بنص فارغ', async () => {
    await writeSavedPage(db, makePage())
    const result = await writePageNote(db, asSavedPageId('p1'), makeNote({ body: '   ' }))
    expect(result.ok).toBe(false)
  })

  it('يرفض الكتابة إلى صفحة غير موجودة، ولا يترك أثرًا', async () => {
    const result = await writePageNote(db, asSavedPageId('ghost'), makeNote())
    expect(result.ok).toBe(false)

    const notes = await listPageNotes(db, asSavedPageId('ghost'))
    expect(notes).toEqual({ items: [], corrupted: [] })
  })

  it('قراءة ملاحظة غير موجودة ضمن صفحة قائمة تعيد not-found', async () => {
    await writeSavedPage(db, makePage())
    const result = await readPageNote(db, asSavedPageId('p1'), asPageNoteId('ghost'))
    expect(result.status).toBe('not-found')
  })

  it('صفحة تالفة ليست كصفحة غائبة: ملاحظاتها تظهر corrupted لا items فارغة بصمت', async () => {
    await putRaw({
      id: 'corrupt', workspaceId: 'w1', url: 'not a valid url', title: 't', capturedAt: 1,
      order: 0, progressStatus: 'not-started', notes: [], addedAt: 1, updatedAt: 1,
    })

    const notes = await listPageNotes(db, asSavedPageId('corrupt'))
    expect(notes.items).toEqual([])
    expect(notes.corrupted).toHaveLength(1)
    expect(notes.corrupted[0]?.key).toBe('corrupt')
  })
})

describe('عزل الملاحظات بين الصفحات', () => {
  it('إضافة ملاحظة لصفحة لا تؤثر في ملاحظات صفحة أخرى', async () => {
    await writeSavedPage(db, makePage({ id: asSavedPageId('p1') }))
    await writeSavedPage(db, makePage({ id: asSavedPageId('p2') }))

    await writePageNote(db, asSavedPageId('p1'), makeNote({ id: asPageNoteId('n-p1') }))
    await writePageNote(db, asSavedPageId('p2'), makeNote({ id: asPageNoteId('n-p2') }))

    const p1Notes = await listPageNotes(db, asSavedPageId('p1'))
    const p2Notes = await listPageNotes(db, asSavedPageId('p2'))

    expect(p1Notes.items.map((n) => n.id)).toEqual(['n-p1'])
    expect(p2Notes.items.map((n) => n.id)).toEqual(['n-p2'])
  })

  it('عدة ملاحظات على الصفحة نفسها تبقى منفصلة ومتاحة كلها', async () => {
    await writeSavedPage(db, makePage())
    await writePageNote(db, asSavedPageId('p1'), makeNote({ id: asPageNoteId('n1') }))
    await writePageNote(db, asSavedPageId('p1'), makeNote({ id: asPageNoteId('n2') }))

    const notes = await listPageNotes(db, asSavedPageId('p1'))
    expect(notes.items.map((n) => n.id).sort()).toEqual(['n1', 'n2'])
  })
})

describe('ذرّية معاملة writePageNote — فشل مركّب يؤدي إلى rollback كامل', () => {
  it('محاولة كتابة ملاحظة لصفحة غير موجودة لا تترك أي أثر في المخزن', async () => {
    await writeSavedPage(db, makePage({ id: asSavedPageId('existing') }))

    const before = await listPagesByWorkspace(db, asWorkspaceId('w1'))
    expect(before.items).toHaveLength(1)

    const result = await writePageNote(db, asSavedPageId('does-not-exist'), makeNote())
    expect(result.ok).toBe(false)

    // لا صفحة جديدة أُنشئت خطأً، ولا الصفحة القائمة تأثرت بمحاولة فاشلة لصفحة أخرى
    const after = await listPagesByWorkspace(db, asWorkspaceId('w1'))
    expect(after.items).toHaveLength(1)
    expect(after.items[0]?.id).toBe('existing')
  })

  it('محاولة تعديل ملاحظة داخل صفحة تالفة تُجهض المعاملة ولا تكتب شيئًا', async () => {
    await putRaw({
      id: 'corrupt', workspaceId: 'w1', url: 'not a valid url', title: 't', capturedAt: 1,
      order: 0, progressStatus: 'not-started', notes: [], addedAt: 1, updatedAt: 1,
    })

    const result = await writePageNote(db, asSavedPageId('corrupt'), makeNote())
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('storage/corrupt-record')

    // السجل التالف يبقى كما هو تمامًا — لم تُضف إليه ملاحظة رغم محاولة الكتابة.
    // والصفحة التالفة نفسها تظهر بوضوح في corrupted، لا كصفحة بلا ملاحظات صمتًا.
    const notes = await listPageNotes(db, asSavedPageId('corrupt'))
    expect(notes.items).toEqual([])
    expect(notes.corrupted).toHaveLength(1)
  })
})

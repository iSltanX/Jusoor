import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'

import { openDatabase, SAVED_PAGES_STORE } from '../../src/storage/database'
import { writeWorkspace } from '../../src/storage/workspaces'
import { listPagesByWorkspace, readSavedPage, writeSavedPage } from '../../src/storage/pages'
import { addPage, reorderPages, updatePage } from '../../src/app/pages'
import type { Clock } from '../../src/app/clock'
import type { IdGenerator } from '../../src/app/ids'
import { asPageNoteId, asSavedPageId, asWorkspaceId } from '../../src/core/ids'
import type { Workspace } from '../../src/core/workspace'
import type { SavedPage } from '../../src/core/page'

let db: IDBDatabase

beforeEach(async () => {
  db = await openDatabase(new IDBFactory())
  // كتابة الصفحات ترفع وقت نشاط مساحتها، فوجود المساحة الأم شرط واقعي لا تفصيل.
  await writeWorkspace(db, makeWorkspace())
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

async function putRawPage(record: unknown): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(SAVED_PAGES_STORE, 'readwrite')
    transaction.objectStore(SAVED_PAGES_STORE).put(record)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('failed'))
  })
}

describe('addPage', () => {
  it('يضيف صفحة جديدة مباشرة عند عدم وجود تطابق سابق', async () => {
    await writeWorkspace(db, makeWorkspace())
    const result = await addPage(db, makeClock(2000), makeIds(), {
      workspaceId: asWorkspaceId('w1'),
      title: 'عنوان',
      url: 'https://example.com/new-page',
      order: 1024,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.saved).toBe(true)
    expect(result.value.needsUserDecision).toBe(false)
    expect(result.value.matches).toEqual([])
  })

  it('يرفض معرف مساحة غير موجودة', async () => {
    const result = await addPage(db, makeClock(), makeIds(), {
      workspaceId: asWorkspaceId('ghost'),
      title: 'عنوان',
      url: 'https://example.com',
      order: 0,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'not-found', entity: 'workspace' })
  })

  it('يرفض رابطًا غير صالح', async () => {
    await writeWorkspace(db, makeWorkspace())
    const result = await addPage(db, makeClock(), makeIds(), {
      workspaceId: asWorkspaceId('w1'),
      title: 'عنوان',
      url: 'ليس رابطًا',
      order: 0,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'invalid-input', field: 'url' })
  })

  it('يرفض order غير صالح (سالب)', async () => {
    await writeWorkspace(db, makeWorkspace())
    const result = await addPage(db, makeClock(), makeIds(), {
      workspaceId: asWorkspaceId('w1'),
      title: 'عنوان',
      url: 'https://example.com',
      order: -1,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'invalid-input', field: 'order' })
  })

  it('عند اكتشاف تطابق دون mode صريح: لا يحفظ، ويعيد needsUserDecision: true مع المطابقات', async () => {
    await writeWorkspace(db, makeWorkspace())
    await writeSavedPage(db, makePage({ id: asSavedPageId('existing') }))

    const result = await addPage(db, makeClock(2000), makeIds(), {
      workspaceId: asWorkspaceId('w1'),
      title: 'عنوان جديد',
      url: 'https://example.com/docs?utm_source=x',
      order: 2048,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.saved).toBe(false)
    expect(result.value.needsUserDecision).toBe(true)
    expect(result.value.matches.map((p) => p.id)).toEqual(['existing'])

    const all = await listPagesByWorkspace(db, asWorkspaceId('w1'))
    expect(all.items).toHaveLength(1)
  })

  it('عند mode: add-new-copy رغم تطابق موجود — يُحفظ فعليًا كنسخة أخرى', async () => {
    await writeWorkspace(db, makeWorkspace())
    await writeSavedPage(db, makePage({ id: asSavedPageId('existing') }))

    const result = await addPage(db, makeClock(2000), makeIds(), {
      workspaceId: asWorkspaceId('w1'),
      title: 'نسخة أخرى',
      url: 'https://example.com/docs',
      order: 2048,
      mode: 'add-new-copy',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.saved).toBe(true)
    expect(result.value.needsUserDecision).toBe(false)
    expect(result.value.matches.map((p) => p.id)).toEqual(['existing'])

    const all = await listPagesByWorkspace(db, asWorkspaceId('w1'))
    expect(all.items).toHaveLength(2)
  })

  it('الرابط الأصلي يُحفظ حرفيًا دون أي تعديل', async () => {
    await writeWorkspace(db, makeWorkspace())
    const literalUrl = 'HTTPS://WWW.Example.com/Docs/?utm_source=x'
    const result = await addPage(db, makeClock(2000), makeIds(), {
      workspaceId: asWorkspaceId('w1'),
      title: 'عنوان',
      url: literalUrl,
      order: 0,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.page.url).toBe(literalUrl)
  })

  it('لا يدمج تلقائيًا مع مطابقة مكتشفة — الصفحة الموجودة تبقى بدون تغيير', async () => {
    await writeWorkspace(db, makeWorkspace())
    const existing = makePage({ id: asSavedPageId('existing'), title: 'عنوان أصلي' })
    await writeSavedPage(db, existing)

    await addPage(db, makeClock(2000), makeIds(), {
      workspaceId: asWorkspaceId('w1'),
      title: 'عنوان مختلف تمامًا',
      url: existing.url,
      order: 2048,
    })

    const stillExisting = await readSavedPage(db, existing.id)
    expect(stillExisting.status).toBe('found')
    if (stillExisting.status !== 'found') return
    expect(stillExisting.value.title).toBe('عنوان أصلي')
  })

  it('يبلّغ عن سجل تالف ضمن نتائج البحث عن تطابق بدل إسقاطه صامتًا', async () => {
    await writeWorkspace(db, makeWorkspace())
    await putRawPage({
      id: 'corrupt', workspaceId: 'w1', url: 'bad url', title: 't', capturedAt: 1,
      order: 0, progressStatus: 'not-started', notes: [], addedAt: 1, updatedAt: 1,
    })

    const result = await addPage(db, makeClock(2000), makeIds(), {
      workspaceId: asWorkspaceId('w1'),
      title: 'عنوان',
      url: 'https://example.com/docs',
      order: 0,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.matchesCorrupted).toHaveLength(1)
  })
})

describe('updatePage', () => {
  it('يحدّث title وreason وprogressStatus وrole وorder', async () => {
    await writeSavedPage(db, makePage())
    const result = await updatePage(db, makeClock(2000), asSavedPageId('p1'), {
      title: 'عنوان جديد',
      reason: 'سبب جديد',
      progressStatus: 'in-progress',
      role: 'primary',
      order: 2048,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.title).toBe('عنوان جديد')
    expect(result.value.reason).toBe('سبب جديد')
    expect(result.value.progressStatus).toBe('in-progress')
    expect(result.value.role).toBe('primary')
    expect(result.value.order).toBe(2048)
  })

  it('لا يغيّر workspaceId — لا حقل لذلك في المدخل', async () => {
    await writeSavedPage(db, makePage({ workspaceId: asWorkspaceId('w1') }))
    const result = await updatePage(db, makeClock(2000), asSavedPageId('p1'), { title: 'x' })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.workspaceId).toBe('w1')
  })

  it('لا يكتب شيئًا فعليًا إن لم يتغيّر شيء — updatedAt يبقى كما هو', async () => {
    await writeSavedPage(db, makePage({ title: 'نفسه', updatedAt: 1000 }))
    const result = await updatePage(db, makeClock(9999), asSavedPageId('p1'), { title: 'نفسه' })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.updatedAt).toBe(1000)
  })

  it('يرفض order غير صالح', async () => {
    await writeSavedPage(db, makePage())
    const result = await updatePage(db, makeClock(), asSavedPageId('p1'), { order: -5 })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'invalid-input', field: 'order' })
  })

  it('يعيد not-found لصفحة غير موجودة', async () => {
    const result = await updatePage(db, makeClock(), asSavedPageId('ghost'), { title: 'x' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'not-found', entity: 'saved-page' })
  })

  it('يحدّث labels بمقارنة المحتوى لا المرجع — نفس المحتوى لا يُحدث كتابة', async () => {
    await writeSavedPage(db, makePage({ labels: ['أ', 'ب'], updatedAt: 1000 }))
    const result = await updatePage(db, makeClock(9999), asSavedPageId('p1'), { labels: ['أ', 'ب'] })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.updatedAt).toBe(1000)
  })
})

describe('reorderPages', () => {
  it('يحفظ ترتيبًا صريحًا لعدة صفحات دفعة واحدة', async () => {
    await writeSavedPage(db, makePage({ id: asSavedPageId('a'), order: 1024 }))
    await writeSavedPage(db, makePage({ id: asSavedPageId('b'), order: 2048 }))

    const result = await reorderPages(db, makeClock(3000), asWorkspaceId('w1'), [
      { pageId: asSavedPageId('a'), order: 2048 },
      { pageId: asSavedPageId('b'), order: 1024 },
    ])

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const all = await listPagesByWorkspace(db, asWorkspaceId('w1'))
    expect(all.items.map((p) => p.id)).toEqual(['b', 'a'])
  })

  it('يرفض معرفات مكررة ضمن الطلب', async () => {
    await writeSavedPage(db, makePage({ id: asSavedPageId('a') }))
    const result = await reorderPages(db, makeClock(), asWorkspaceId('w1'), [
      { pageId: asSavedPageId('a'), order: 0 },
      { pageId: asSavedPageId('a'), order: 1 },
    ])

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'invalid-input', field: 'pageId' })
  })

  it('يرفض صفحة من مساحة أخرى', async () => {
    await writeSavedPage(db, makePage({ id: asSavedPageId('other-ws'), workspaceId: asWorkspaceId('w2') }))
    const result = await reorderPages(db, makeClock(), asWorkspaceId('w1'), [
      { pageId: asSavedPageId('other-ws'), order: 0 },
    ])

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'not-found', entity: 'saved-page' })
  })

  it('الصفحات غير المذكورة في الطلب تبقى بترتيبها الحالي دون تغيير', async () => {
    await writeSavedPage(db, makePage({ id: asSavedPageId('a'), order: 1024 }))
    await writeSavedPage(db, makePage({ id: asSavedPageId('untouched'), order: 5000 }))

    await reorderPages(db, makeClock(3000), asWorkspaceId('w1'), [
      { pageId: asSavedPageId('a'), order: 9000 },
    ])

    const untouched = await readSavedPage(db, asSavedPageId('untouched'))
    expect(untouched.status).toBe('found')
    if (untouched.status !== 'found') return
    expect(untouched.value.order).toBe(5000)
  })

  it('ذرّية: صفحة واحدة غير موجودة ضمن الطلب تمنع الكتابة كلها — لا تحديث جزئي', async () => {
    await writeSavedPage(db, makePage({ id: asSavedPageId('a'), order: 1024 }))
    await writeSavedPage(db, makePage({ id: asSavedPageId('b'), order: 2048 }))

    const result = await reorderPages(db, makeClock(3000), asWorkspaceId('w1'), [
      { pageId: asSavedPageId('a'), order: 9000 },
      { pageId: asSavedPageId('b'), order: 9001 },
      { pageId: asSavedPageId('does-not-exist'), order: 9002 },
    ])

    expect(result.ok).toBe(false)

    const stillA = await readSavedPage(db, asSavedPageId('a'))
    const stillB = await readSavedPage(db, asSavedPageId('b'))
    expect(stillA.status).toBe('found')
    expect(stillB.status).toBe('found')
    if (stillA.status === 'found') expect(stillA.value.order).toBe(1024)
    if (stillB.status === 'found') expect(stillB.value.order).toBe(2048)
  })

  it('يرفض order غير صالح ضمن أحد العناصر', async () => {
    await writeSavedPage(db, makePage({ id: asSavedPageId('a') }))
    const result = await reorderPages(db, makeClock(), asWorkspaceId('w1'), [
      { pageId: asSavedPageId('a'), order: -1 },
    ])

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'invalid-input', field: 'order' })
  })

  it('سجل تالف بنفس المعرف المطلوب يُبلَّغ صراحةً، لا يُعامَل كغياب صامت', async () => {
    await putRawPage({
      id: 'corrupt', workspaceId: 'w1', url: 'bad url', title: 't', capturedAt: 1,
      order: 0, progressStatus: 'not-started', notes: [], addedAt: 1, updatedAt: 1,
    })

    const result = await reorderPages(db, makeClock(), asWorkspaceId('w1'), [
      { pageId: asSavedPageId('corrupt'), order: 0 },
    ])

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.kind).toBe('storage')
  })
})

import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'

import { openDatabase, SAVED_PAGES_STORE } from '../../src/storage/database'
import { readWorkspace, writeWorkspace } from '../../src/storage/workspaces'
import { writeSavedPage } from '../../src/storage/pages'
import {
  createWorkspace,
  freezeWorkspaceState,
  reactivateWorkspace,
  readWorkspaceView,
  updateCheckpoint,
  updateWorkspace,
} from '../../src/app/workspaces'
import type { Clock } from '../../src/app/clock'
import type { IdGenerator } from '../../src/app/ids'
import { asPageNoteId, asSavedPageId, asWorkspaceId } from '../../src/core/ids'
import type { Workspace } from '../../src/core/workspace'
import type { SavedPage } from '../../src/core/page'

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
    name: 'تحليل أطر الخصوصية',
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

describe('createWorkspace', () => {
  it('ينشئ مساحة بالاسم فقط دون إجبار على تعبئة بقية الحقول', async () => {
    const clock = makeClock(5000)
    const ids = makeIds()

    const result = await createWorkspace(db, clock, ids, { name: 'مساحة جديدة' })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.name).toBe('مساحة جديدة')
    expect(result.value.goal).toBeUndefined()
    expect(result.value.description).toBeUndefined()
  })

  it('يستخدم المعرف والوقت المحقونين حصرًا — لا Date.now ولا crypto.randomUUID حقيقيين', async () => {
    const clock = makeClock(12345)
    const ids = makeIds('fixed')

    const result = await createWorkspace(db, clock, ids, { name: 'مساحة' })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.id).toBe('fixed-workspace-1')
    expect(result.value.createdAt).toBe(12345)
    expect(result.value.updatedAt).toBe(12345)
    expect(result.value.lastWorkedAt).toBe(12345)
  })

  it('يرفض اسمًا فارغًا بعد trim', async () => {
    const result = await createWorkspace(db, makeClock(), makeIds(), { name: '   ' })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'invalid-input', field: 'name' })
  })

  it('لا ينشئ أي صفحات مع المساحة — قائمة الصفحات فارغة بعد الإنشاء مباشرة', async () => {
    const ids = makeIds()
    const created = await createWorkspace(db, makeClock(), ids, { name: 'مساحة' })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const view = await readWorkspaceView(db, created.value.id)
    expect(view.ok).toBe(true)
    if (!view.ok) return
    expect(view.value.pages).toEqual([])
  })

  it('يحفظ المساحة فعليًا في التخزين — قابلة للقراءة مباشرة بعد الإنشاء', async () => {
    const ids = makeIds()
    const created = await createWorkspace(db, makeClock(), ids, { name: 'مساحة محفوظة' })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const read = await readWorkspace(db, created.value.id)
    expect(read.status).toBe('found')
    if (read.status !== 'found') return
    expect(read.value.name).toBe('مساحة محفوظة')
  })

  it('يقبل goal ويطبّعه عبر normalizeOptionalText الموجودة أصلًا في core', async () => {
    const result = await createWorkspace(db, makeClock(), makeIds(), {
      name: 'مساحة',
      goal: '  هدف بمسافات طرفية  ',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.goal).toBe('هدف بمسافات طرفية')
  })
})

describe('readWorkspaceView', () => {
  it('يعيد المساحة مع صفحاتها مرتبة حسب order', async () => {
    await writeWorkspace(db, makeWorkspace())
    await writeSavedPage(db, makePage({ id: asSavedPageId('b'), order: 2048 }))
    await writeSavedPage(db, makePage({ id: asSavedPageId('a'), order: 1024 }))

    const view = await readWorkspaceView(db, asWorkspaceId('w1'))
    expect(view.ok).toBe(true)
    if (!view.ok) return
    expect(view.value.pages.map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('يعيد not-found لمساحة غير موجودة', async () => {
    const view = await readWorkspaceView(db, asWorkspaceId('ghost'))
    expect(view.ok).toBe(false)
    if (view.ok) return
    expect(view.error).toEqual({ kind: 'not-found', entity: 'workspace' })
  })

  it('الملاحظات المضمَّنة تصل مع صفحاتها دون استعلام إضافي', async () => {
    await writeWorkspace(db, makeWorkspace())
    await writeSavedPage(
      db,
      makePage({ notes: [{ id: asPageNoteId('n1'), body: 'ملاحظة', createdAt: 1, updatedAt: 1 }] }),
    )

    const view = await readWorkspaceView(db, asWorkspaceId('w1'))
    expect(view.ok).toBe(true)
    if (!view.ok) return
    expect(view.value.pages[0]?.notes).toHaveLength(1)
  })

  it('صفحة تالفة تظهر في corruptedPages ولا تختفي، والصفحات الصالحة تبقى في pages', async () => {
    await writeWorkspace(db, makeWorkspace())
    await writeSavedPage(db, makePage({ id: asSavedPageId('valid') }))
    await putRawPage({
      id: 'corrupt', workspaceId: 'w1', url: 'not a url', title: 't', capturedAt: 1,
      order: 0, progressStatus: 'not-started', notes: [], addedAt: 1, updatedAt: 1,
    })

    const view = await readWorkspaceView(db, asWorkspaceId('w1'))
    expect(view.ok).toBe(true)
    if (!view.ok) return
    expect(view.value.pages.map((p) => p.id)).toEqual(['valid'])
    expect(view.value.corruptedPages).toHaveLength(1)
  })

  it('ليس ViewModel بصريًا: القيمة المعادة تقتصر على workspace وpages وcorruptedPages فقط', async () => {
    await writeWorkspace(db, makeWorkspace())

    const view = await readWorkspaceView(db, asWorkspaceId('w1'))
    expect(view.ok).toBe(true)
    if (!view.ok) return
    expect(Object.keys(view.value).sort()).toEqual(['corruptedPages', 'pages', 'workspace'])
  })
})

describe('updateWorkspace', () => {
  it('يحدّث الاسم بعد trim', async () => {
    await writeWorkspace(db, makeWorkspace())
    const result = await updateWorkspace(db, makeClock(2000), asWorkspaceId('w1'), {
      name: '  اسم جديد  ',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.name).toBe('اسم جديد')
  })

  it('لا يغيّر id — لا حقل لذلك في المدخل أصلًا', async () => {
    await writeWorkspace(db, makeWorkspace())
    const result = await updateWorkspace(db, makeClock(2000), asWorkspaceId('w1'), {
      name: 'اسم آخر',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.id).toBe('w1')
  })

  it('لا يمس status — يبقى كما كان بعد تحديث حقل آخر', async () => {
    await writeWorkspace(db, makeWorkspace({ status: 'active' }))
    const result = await updateWorkspace(db, makeClock(2000), asWorkspaceId('w1'), {
      goal: 'هدف جديد',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.status).toBe('active')
  })

  it('لا يكتب شيئًا فعليًا إن لم يتغيّر شيء — updatedAt يبقى كما هو', async () => {
    await writeWorkspace(db, makeWorkspace({ name: 'اسم', updatedAt: 1000 }))
    const result = await updateWorkspace(db, makeClock(9999), asWorkspaceId('w1'), {
      name: 'اسم',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.updatedAt).toBe(1000)
  })

  it('يرفض اسمًا فارغًا', async () => {
    await writeWorkspace(db, makeWorkspace())
    const result = await updateWorkspace(db, makeClock(), asWorkspaceId('w1'), { name: '   ' })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'invalid-input', field: 'name' })
  })

  it('يحذف goal فعليًا عند إرسال نص فارغ — لا فرق شكلي بين الغياب والفراغ', async () => {
    await writeWorkspace(db, makeWorkspace({ goal: 'هدف قديم' }))
    const result = await updateWorkspace(db, makeClock(2000), asWorkspaceId('w1'), { goal: '   ' })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.goal).toBeUndefined()
  })

  it('يعيد not-found لمساحة غير موجودة', async () => {
    const result = await updateWorkspace(db, makeClock(), asWorkspaceId('ghost'), { name: 'x' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'not-found', entity: 'workspace' })
  })
})

describe('updateCheckpoint', () => {
  it('يحفظ lastReached وnextStep حرفيًا دون قص أو تحليل', async () => {
    await writeWorkspace(db, makeWorkspace())
    const text = 'وصلت إلى القسم الثالث بعد مراجعة GDPR كاملًا'
    const result = await updateCheckpoint(db, makeClock(2000), asWorkspaceId('w1'), {
      lastReached: text,
      nextStep: 'راجع القسم الرابع',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.lastReached).toBe(text)
    expect(result.value.nextStep).toBe('راجع القسم الرابع')
  })

  it('لا يشترط التجميد لتحديثه — يعمل على مساحة active', async () => {
    await writeWorkspace(db, makeWorkspace({ status: 'active' }))
    const result = await updateCheckpoint(db, makeClock(2000), asWorkspaceId('w1'), {
      nextStep: 'خطوة تالية',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.status).toBe('active')
    expect(result.value.nextStep).toBe('خطوة تالية')
  })

  it('كل من lastReached وnextStep اختياري — تحديث أحدهما يترك الآخر كما هو', async () => {
    await writeWorkspace(db, makeWorkspace({ lastReached: 'قديم', nextStep: 'قديم أيضًا' }))
    const result = await updateCheckpoint(db, makeClock(2000), asWorkspaceId('w1'), {
      nextStep: 'جديد',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.lastReached).toBe('قديم')
    expect(result.value.nextStep).toBe('جديد')
  })

  it('لا يكتب شيئًا فعليًا إن لم يتغيّر شيء', async () => {
    await writeWorkspace(db, makeWorkspace({ lastReached: 'نفسه', updatedAt: 1000 }))
    const result = await updateCheckpoint(db, makeClock(9999), asWorkspaceId('w1'), {
      lastReached: 'نفسه',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.updatedAt).toBe(1000)
  })
})

describe('freezeWorkspaceState', () => {
  it('يحوّل الحالة إلى frozen ويضبط frozenAt', async () => {
    await writeWorkspace(db, makeWorkspace({ status: 'active' }))
    const result = await freezeWorkspaceState(db, makeClock(5000), asWorkspaceId('w1'))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.status).toBe('frozen')
    expect(result.value.frozenAt).toBe(5000)
  })

  it('يحفظ lastReached وnextStep ضمن استدعاء التجميد نفسه', async () => {
    await writeWorkspace(db, makeWorkspace({ status: 'active' }))
    const result = await freezeWorkspaceState(db, makeClock(5000), asWorkspaceId('w1'), {
      lastReached: 'توقفت هنا',
      nextStep: 'أكمل من هنا',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.lastReached).toBe('توقفت هنا')
    expect(result.value.nextStep).toBe('أكمل من هنا')
  })

  it('يرفض تجميد مساحة مجمدة أصلًا (انتقال حالة غير مسموح)', async () => {
    await writeWorkspace(db, makeWorkspace({ status: 'frozen', frozenAt: 500 }))
    const result = await freezeWorkspaceState(db, makeClock(5000), asWorkspaceId('w1'))

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'domain', code: 'workspace/invalid-status-transition' })
  })

  it('يحدّث lastWorkedAt عبر Clock المحقون', async () => {
    await writeWorkspace(db, makeWorkspace({ status: 'active', lastWorkedAt: 100 }))
    const result = await freezeWorkspaceState(db, makeClock(7000), asWorkspaceId('w1'))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.lastWorkedAt).toBe(7000)
  })
})

describe('reactivateWorkspace', () => {
  it('يحوّل من frozen إلى active ويزيل frozenAt', async () => {
    await writeWorkspace(db, makeWorkspace({ status: 'frozen', frozenAt: 500 }))
    const result = await reactivateWorkspace(db, makeClock(9000), asWorkspaceId('w1'))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.status).toBe('active')
    expect(result.value.frozenAt).toBeUndefined()
  })

  it('يرفض إعادة تنشيط مساحة نشطة أصلًا', async () => {
    await writeWorkspace(db, makeWorkspace({ status: 'active' }))
    const result = await reactivateWorkspace(db, makeClock(9000), asWorkspaceId('w1'))

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toEqual({ kind: 'domain', code: 'workspace/invalid-status-transition' })
  })

  it('لا يضيف أي حقل نتيجة استعادة — القيمة المعادة تطابق حقول Workspace فقط', async () => {
    await writeWorkspace(db, makeWorkspace({ status: 'frozen', frozenAt: 500 }))
    const result = await reactivateWorkspace(db, makeClock(9000), asWorkspaceId('w1'))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(Object.keys(result.value).sort()).toEqual(
      ['createdAt', 'id', 'lastWorkedAt', 'name', 'status', 'template', 'updatedAt'].sort(),
    )
  })
})

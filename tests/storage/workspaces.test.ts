import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'

import { openDatabase, WORKSPACES_STORE } from '../../src/storage/database'
import {
  listWorkspaces,
  parseWorkspaceRecord,
  readWorkspace,
  writeWorkspace,
} from '../../src/storage/workspaces'
import { asWorkspaceId } from '../../src/core/ids'
import type { Workspace } from '../../src/core/workspace'

let db: IDBDatabase

beforeEach(async () => {
  // قاعدة جديدة معزولة تمامًا لكل اختبار — لا مشاركة حالة، ولا اتصال متسرب
  // بين الحالات؛ تُغلق صراحةً في كل اختبار بعد استخدامها.
  db = await openDatabase(new IDBFactory())
})

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

async function putRaw(record: unknown): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(WORKSPACES_STORE, 'readwrite')
    transaction.objectStore(WORKSPACES_STORE).put(record)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('failed'))
  })
}

describe('round-trip', () => {
  it('يحفظ مساحة ويقرؤها بكل حقولها الاختيارية سليمة', async () => {
    const workspace = makeWorkspace({
      goal: 'مقارنة GDPR وCCPA',
      description: 'وصف المهمة',
      generalNote: 'ملاحظة عامة',
      lastReached: 'حددت ثلاثة اختلافات',
      nextStep: 'راجع القسم الثالث',
    })

    const written = await writeWorkspace(db, workspace)
    expect(written.ok).toBe(true)

    const result = await readWorkspace(db, workspace.id)
    expect(result.status).toBe('found')
    if (result.status !== 'found') return
    expect(result.value).toEqual(workspace)
  })

  it('يحدّث مساحة قائمة بنفس المعرف دون إنشاء سجل مكرر', async () => {
    const workspace = makeWorkspace()
    await writeWorkspace(db, workspace)

    const updated: Workspace = { ...workspace, name: 'اسم محدَّث', updatedAt: 2000 }
    await writeWorkspace(db, updated)

    const all = await listWorkspaces(db)
    expect(all.items).toHaveLength(1)
    expect(all.items[0]?.name).toBe('اسم محدَّث')
  })
})

describe('رفض الكتابة غير الصالحة', () => {
  it('يرفض اسمًا فارغًا', async () => {
    const result = await writeWorkspace(db, makeWorkspace({ name: '   ' }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('storage/invalid-write')
  })

  it('يرفض عدم اتساق الحالة مع تواريخها', async () => {
    const result = await writeWorkspace(db, makeWorkspace({ status: 'frozen' }))
    expect(result.ok).toBe(false)
  })

  it('لا يكتب شيئًا فعليًا عند رفض التحقق', async () => {
    await writeWorkspace(db, makeWorkspace({ name: '' }))
    const all = await listWorkspaces(db)
    expect(all).toEqual({ items: [], corrupted: [] })
  })
})

describe('قراءة سجل غائب', () => {
  it('يميّز الغياب عن التلف صراحةً', async () => {
    const result = await readWorkspace(db, asWorkspaceId('ghost'))
    expect(result.status).toBe('not-found')
  })
})

describe('رفض أو الإبلاغ عن السجلات التالفة', () => {
  it('يرفض سجلًا بمعرف فارغ', async () => {
    await putRaw({ id: '   ', name: 'x', template: 'general', status: 'active', createdAt: 1, updatedAt: 1, lastWorkedAt: 1 })
    const result = await readWorkspace(db, asWorkspaceId('   '))
    expect(result.status).toBe('corrupt')
  })

  it('يرفض حالة enum غير معروفة', async () => {
    await putRaw({ id: 'w1', name: 'x', template: 'general', status: 'deleted', createdAt: 1, updatedAt: 1, lastWorkedAt: 1 })
    const result = await readWorkspace(db, asWorkspaceId('w1'))
    expect(result.status).toBe('corrupt')
  })

  it('يرفض قالبًا غير معروف', async () => {
    await putRaw({ id: 'w1', name: 'x', template: 'unknown-template', status: 'active', createdAt: 1, updatedAt: 1, lastWorkedAt: 1 })
    const result = await readWorkspace(db, asWorkspaceId('w1'))
    expect(result.status).toBe('corrupt')
  })

  it('يرفض timestamp غير صالح (نصيًا)', async () => {
    await putRaw({ id: 'w1', name: 'x', template: 'general', status: 'active', createdAt: 'not-a-number', updatedAt: 1, lastWorkedAt: 1 })
    const result = await readWorkspace(db, asWorkspaceId('w1'))
    expect(result.status).toBe('corrupt')
  })

  it('يرفض timestamp غير صالح (صفريًا أو سالبًا)', async () => {
    await putRaw({ id: 'w1', name: 'x', template: 'general', status: 'active', createdAt: 0, updatedAt: 1, lastWorkedAt: 1 })
    const result = await readWorkspace(db, asWorkspaceId('w1'))
    expect(result.status).toBe('corrupt')
  })

  it('يرفض createdAt أكبر من updatedAt', async () => {
    await putRaw({ id: 'w1', name: 'x', template: 'general', status: 'active', createdAt: 500, updatedAt: 100, lastWorkedAt: 500 })
    const result = await readWorkspace(db, asWorkspaceId('w1'))
    expect(result.status).toBe('corrupt')
  })

  it('يرفض حالة frozen بلا frozenAt (عدم اتساق)', async () => {
    await putRaw({ id: 'w1', name: 'x', template: 'general', status: 'frozen', createdAt: 1, updatedAt: 1, lastWorkedAt: 1 })
    const result = await readWorkspace(db, asWorkspaceId('w1'))
    expect(result.status).toBe('corrupt')
  })

  it('يرفض اسمًا مفقودًا (نوعًا غير string)', async () => {
    await putRaw({ id: 'w1', name: 42, template: 'general', status: 'active', createdAt: 1, updatedAt: 1, lastWorkedAt: 1 })
    const result = await readWorkspace(db, asWorkspaceId('w1'))
    expect(result.status).toBe('corrupt')
  })

  it('لا يسمح لسجل تالف بالمرور صامتًا كمساحة صحيحة (parseWorkspaceRecord مباشرة)', () => {
    const result = parseWorkspaceRecord({ id: 'w1' })
    expect(result.ok).toBe(false)
  })

  it('يرفض قيمة غير كائن كليًا', () => {
    expect(parseWorkspaceRecord('not an object').ok).toBe(false)
    expect(parseWorkspaceRecord(null).ok).toBe(false)
    expect(parseWorkspaceRecord(undefined).ok).toBe(false)
  })
})

describe('listWorkspaces', () => {
  it('السجلات الصالحة تبقى متاحة في items حتى مع وجود سجل تالف بجانبها', async () => {
    await writeWorkspace(db, makeWorkspace({ id: asWorkspaceId('valid') }))
    await putRaw({ id: 'corrupt', name: 42, template: 'general', status: 'active', createdAt: 1, updatedAt: 1, lastWorkedAt: 1 })

    const all = await listWorkspaces(db)
    expect(all.items).toHaveLength(1)
    expect(all.items[0]?.id).toBe('valid')
  })

  it('السجل التالف لا يختفي صامتًا — يظهر في corrupted بمعرفه وسبب الرفض', async () => {
    await putRaw({ id: 'corrupt', name: 42, template: 'general', status: 'active', createdAt: 1, updatedAt: 1, lastWorkedAt: 1 })

    const all = await listWorkspaces(db)
    expect(all.corrupted).toHaveLength(1)
    expect(all.corrupted[0]?.store).toBe('workspaces')
    expect(all.corrupted[0]?.key).toBe('corrupt')
    expect(all.corrupted[0]?.error).toBe('storage/corrupt-record')
    expect(all.corrupted[0]?.details).toBe('name')
  })

  it('السجل التالف لا يُعامَل كصالح: لا يظهر أبدًا في items', async () => {
    await putRaw({ id: 'corrupt', name: 42, template: 'general', status: 'active', createdAt: 1, updatedAt: 1, lastWorkedAt: 1 })

    const all = await listWorkspaces(db)
    expect(all.items.some((w) => w.id === 'corrupt')).toBe(false)
  })

  it('لا تُظهر details محتوى القيمة التالفة نفسها، بل اسم الحقل فقط', async () => {
    await putRaw({
      id: 'w1',
      name: 'سر شخصي حساس لا ينبغي تسريبه',
      template: 'general',
      status: 'deleted-not-a-real-status',
      createdAt: 1,
      updatedAt: 1,
      lastWorkedAt: 1,
    })

    const all = await listWorkspaces(db)
    expect(all.corrupted[0]?.details).toBe('status')
    expect(JSON.stringify(all.corrupted)).not.toContain('سر شخصي حساس')
  })

  it('تعذر تحديد المعرف نفسه إن كان id غير سليم — key يبقى غائبًا لا مخترَعًا', async () => {
    await putRaw({ id: 123, name: 'x', template: 'general', status: 'active', createdAt: 1, updatedAt: 1, lastWorkedAt: 1 })

    const all = await listWorkspaces(db)
    expect(all.corrupted).toHaveLength(1)
    expect(all.corrupted[0]?.key).toBeUndefined()
  })

  it('يرتب بترتيب محايد تقنيًا: الأقدم إنشاءً أولًا', async () => {
    await writeWorkspace(db, makeWorkspace({ id: asWorkspaceId('newer'), createdAt: 2000, updatedAt: 2000, lastWorkedAt: 2000 }))
    await writeWorkspace(db, makeWorkspace({ id: asWorkspaceId('older'), createdAt: 1000, updatedAt: 1000, lastWorkedAt: 1000 }))

    const all = await listWorkspaces(db)
    expect(all.items.map((w) => w.id)).toEqual(['older', 'newer'])
  })

  it('يحسم التعادل في createdAt بترتيب المعرف', async () => {
    await writeWorkspace(db, makeWorkspace({ id: asWorkspaceId('b'), createdAt: 1000, updatedAt: 1000, lastWorkedAt: 1000 }))
    await writeWorkspace(db, makeWorkspace({ id: asWorkspaceId('a'), createdAt: 1000, updatedAt: 1000, lastWorkedAt: 1000 }))

    const all = await listWorkspaces(db)
    expect(all.items.map((w) => w.id)).toEqual(['a', 'b'])
  })

  it('قائمة فارغة عند عدم وجود مساحات', async () => {
    expect(await listWorkspaces(db)).toEqual({ items: [], corrupted: [] })
  })
})

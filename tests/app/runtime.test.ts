import { beforeEach, describe, expect, it, vi } from 'vitest'

import { asPageNoteId, asSavedPageId, asWorkspaceId } from '../../src/core/ids'

/**
 * `getDatabase` يحفظ مقبض القاعدة مرة واحدة. الاختبار الحاسم هنا هو مسار
 * **التعافي**: وعد مفتوح مرفوض لو خُزِّن لجعل كل محاولة لاحقة تفشل بالفشل
 * الأول نفسه، فتستحيل إعادة المحاولة التي يعتمد عليها زر «إعادة المحاولة».
 */
const openDatabase = vi.fn()

vi.mock('../../src/storage/database', () => ({
  openDatabase: (...args: unknown[]) => openDatabase(...args) as unknown,
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

/** يُحمَّل من جديد في كل اختبار حتى تبدأ الوحدة بحالة مقبض فارغة. */
async function loadRuntime() {
  return import('../../src/app/runtime')
}

describe('getDatabase', () => {
  it('يفتح القاعدة مرة واحدة ويعيد المقبض نفسه بعدها', async () => {
    const handle = { name: 'jusoor' }
    openDatabase.mockResolvedValue(handle)

    const { getDatabase } = await loadRuntime()

    expect(await getDatabase()).toBe(handle)
    expect(await getDatabase()).toBe(handle)
    expect(openDatabase).toHaveBeenCalledTimes(1)
  })

  it('يمرّر الفشل إلى المستدعي بدل ابتلاعه', async () => {
    openDatabase.mockRejectedValue(new Error('تعذر الفتح'))

    const { getDatabase } = await loadRuntime()

    await expect(getDatabase()).rejects.toThrow('تعذر الفتح')
  })

  it('لا يخزّن الفشل: محاولة بعد فشل تفتح القاعدة من جديد وتنجح', async () => {
    const handle = { name: 'jusoor' }
    openDatabase.mockRejectedValueOnce(new Error('عطل عابر')).mockResolvedValue(handle)

    const { getDatabase } = await loadRuntime()

    await expect(getDatabase()).rejects.toThrow('عطل عابر')

    // لو خُزِّن الوعد المرفوض لفشلت هذه أيضًا بالرسالة نفسها
    expect(await getDatabase()).toBe(handle)
    expect(openDatabase).toHaveBeenCalledTimes(2)
  })

  it('فشلان متتاليان يعيدان المحاولة فعليًا في كل مرة', async () => {
    openDatabase.mockRejectedValue(new Error('عطل مستمر'))

    const { getDatabase } = await loadRuntime()

    await expect(getDatabase()).rejects.toThrow('عطل مستمر')
    await expect(getDatabase()).rejects.toThrow('عطل مستمر')
    expect(openDatabase).toHaveBeenCalledTimes(2)
  })
})

describe('systemClock', () => {
  it('يقرأ الوقت الحقيقي عند الاستدعاء لا عند التحميل', async () => {
    const { systemClock } = await loadRuntime()

    const before = Date.now()
    const reading = systemClock.now()
    const after = Date.now()

    expect(reading).toBeGreaterThanOrEqual(before)
    expect(reading).toBeLessThanOrEqual(after)
  })
})

describe('randomIdGenerator', () => {
  it('يولّد معرفات فريدة لكل نوع', async () => {
    const { randomIdGenerator } = await loadRuntime()

    const workspaceIds = new Set([
      randomIdGenerator.workspaceId(),
      randomIdGenerator.workspaceId(),
      randomIdGenerator.workspaceId(),
    ])
    expect(workspaceIds.size).toBe(3)

    expect(new Set([randomIdGenerator.savedPageId(), randomIdGenerator.savedPageId()]).size).toBe(2)
    expect(new Set([randomIdGenerator.pageNoteId(), randomIdGenerator.pageNoteId()]).size).toBe(2)
  })

  it('المعرفات نصوص غير فارغة صالحة للوسم', async () => {
    const { randomIdGenerator } = await loadRuntime()

    const workspaceId = randomIdGenerator.workspaceId()
    expect(typeof workspaceId).toBe('string')
    expect(workspaceId.length).toBeGreaterThan(0)

    // الوسم لا يغيّر القيمة، فمرورها عبر asWorkspaceId يعيدها نفسها
    expect(asWorkspaceId(workspaceId)).toBe(workspaceId)
    expect(asSavedPageId(randomIdGenerator.savedPageId())).toBeTruthy()
    expect(asPageNoteId(randomIdGenerator.pageNoteId())).toBeTruthy()
  })
})

import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'

import {
  DATABASE_NAME,
  DATABASE_VERSION,
  SAVED_PAGES_BY_WORKSPACE_INDEX,
  SAVED_PAGES_STORE,
  WORKSPACES_STORE,
  openDatabase,
} from '../../src/storage/database'

/**
 * إثبات أن القاعدة تُفتح بإصدارها الثاني وبمخططها الفعلي، وأن الترقية من
 * الإصدار الأول الفارغ (ما صدر في مرحلة التأسيس) تعمل دون فقد بيانات ودون
 * إعادة إنشاء مخازن قائمة عند إعادة الفتح.
 */
describe('openDatabase — قاعدة جديدة', () => {
  it('يفتح القاعدة بالاسم والإصدار المعلنين', async () => {
    const db = await openDatabase(new IDBFactory())

    expect(db.name).toBe(DATABASE_NAME)
    expect(db.version).toBe(DATABASE_VERSION)
    expect(DATABASE_VERSION).toBe(2)

    db.close()
  })

  it('ينشئ مخزني المساحات والصفحات بالمخطط الصحيح', async () => {
    const db = await openDatabase(new IDBFactory())

    expect(Array.from(db.objectStoreNames).sort()).toEqual(
      [SAVED_PAGES_STORE, WORKSPACES_STORE].sort(),
    )

    const transaction = db.transaction(SAVED_PAGES_STORE, 'readonly')
    const store = transaction.objectStore(SAVED_PAGES_STORE)
    expect(store.keyPath).toBe('id')
    expect(Array.from(store.indexNames)).toEqual([SAVED_PAGES_BY_WORKSPACE_INDEX])

    const index = store.index(SAVED_PAGES_BY_WORKSPACE_INDEX)
    expect(index.keyPath).toBe('workspaceId')
    expect(index.unique).toBe(false)

    const workspacesStore = db.transaction(WORKSPACES_STORE, 'readonly').objectStore(WORKSPACES_STORE)
    expect(workspacesStore.keyPath).toBe('id')

    db.close()
  })
})

describe('openDatabase — الترقية من الإصدار السابق', () => {
  it('يُرقّي من الإصدار 1 الفارغ (ما صدر في مرحلة التأسيس) إلى الإصدار 2 بإنشاء المخططين', async () => {
    const factory = new IDBFactory()

    // يحاكي مستخدمًا سبق أن ثبّت مرحلة التأسيس: قاعدة بالإصدار 1 بلا أي مخزن،
    // مطابقة تمامًا لما كانت ترحيلة الإصدار 1 الفعلية تنتجه قبل هذه المرحلة.
    const v1 = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(DATABASE_NAME, 1)
      request.onupgradeneeded = () => {
        // لا شيء — مطابق لترحيلة الإصدار 1 الفارغة الفعلية.
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('failed'))
    })
    expect(Array.from(v1.objectStoreNames)).toEqual([])
    v1.close()

    const v2 = await openDatabase(factory)

    expect(v2.version).toBe(2)
    expect(Array.from(v2.objectStoreNames).sort()).toEqual(
      [SAVED_PAGES_STORE, WORKSPACES_STORE].sort(),
    )

    v2.close()
  })

  it('يقفز من الإصدار 1 مباشرة إلى الأحدث ويطبّق كل الترحيلات الوسيطة', async () => {
    // بما أن الإصدار الحالي هو 2 (الترحيلة التالية مباشرة بعد 1 الفارغة)، هذا
    // الاختبار يطابق اختبار الترقية أعلاه فعليًا؛ يبقى منفصلًا لتوثيق النية:
    // القفز عبر أكثر من إصدار مستقبلًا يجب أن يستمر بالعمل بالحلقة التسلسلية
    // الحالية في openDatabase دون تعديل عند إضافة ترحيلات لاحقة.
    const factory = new IDBFactory()
    await new Promise<void>((resolve, reject) => {
      const request = factory.open(DATABASE_NAME, 1)
      request.onupgradeneeded = () => {}
      request.onsuccess = () => {
        request.result.close()
        resolve()
      }
      request.onerror = () => reject(request.error ?? new Error('failed'))
    })

    const db = await openDatabase(factory)
    expect(db.version).toBe(DATABASE_VERSION)
    expect(Array.from(db.objectStoreNames).length).toBe(2)
    db.close()
  })
})

describe('openDatabase — إعادة الفتح لا تكسر قاعدة موجودة', () => {
  it('لا يعيد إنشاء المخازن ولا يفقد البيانات عند إعادة الفتح بالإصدار نفسه', async () => {
    const factory = new IDBFactory()

    const first = await openDatabase(factory)
    await new Promise<void>((resolve, reject) => {
      const transaction = first.transaction(WORKSPACES_STORE, 'readwrite')
      transaction.objectStore(WORKSPACES_STORE).put({ id: 'w1', name: 'x' })
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('failed'))
    })
    first.close()

    // إعادة الفتح لا يجب أن تطلق onupgradeneeded إطلاقًا (oldVersion === newVersion)،
    // فلا محاولة لإعادة إنشاء مخزن قائم تفشل بخطأ "already exists".
    const second = await openDatabase(factory)
    expect(second.version).toBe(DATABASE_VERSION)
    expect(Array.from(second.objectStoreNames).sort()).toEqual(
      [SAVED_PAGES_STORE, WORKSPACES_STORE].sort(),
    )

    const stored = await new Promise<unknown>((resolve, reject) => {
      const transaction = second.transaction(WORKSPACES_STORE, 'readonly')
      const request = transaction.objectStore(WORKSPACES_STORE).get('w1')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('failed'))
    })
    expect(stored).toEqual({ id: 'w1', name: 'x' })

    second.close()
  })

  it('يفتح القاعدة نفسها مرتين متتاليتين دون خطأ (تكرار الاختبار القائم سابقًا)', async () => {
    const factory = new IDBFactory()

    const first = await openDatabase(factory)
    first.close()

    const second = await openDatabase(factory)
    expect(second.version).toBe(DATABASE_VERSION)
    second.close()
  })
})

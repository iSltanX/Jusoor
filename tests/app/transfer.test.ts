import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'

import { openDatabase } from '../../src/storage/database'
import { listPagesByWorkspace } from '../../src/storage/pages'
import { listWorkspaces, readWorkspace } from '../../src/storage/workspaces'
import { writeWorkspaceWithPages } from '../../src/storage/workspace-with-pages'
import { parseTransfer, serializeTransfer } from '../../src/storage/transfer'
import { planAndWriteImport, type ImportResolution } from '../../src/app/transfer'
import type { IdGenerator } from '../../src/app/ids'
import { asPageNoteId, asSavedPageId, asWorkspaceId } from '../../src/core/ids'
import type { SavedPage } from '../../src/core/page'
import type { Workspace } from '../../src/core/workspace'

/**
 * قرار التعارض — §9.10 يعدّ أربعة خيارات صريحة، ولكل واحد دلالة مختلفة تمامًا
 * عن الآخر. هذه الاختبارات تثبت الأربعة سلوكًا لا وجودًا، وتثبت خصوصًا ما
 * **لا** يفعله كل خيار: الدمج لا يغيّر سجل المساحة، والإلغاء لا يكتب شيئًا.
 */

let db: IDBDatabase

beforeEach(async () => {
  db = await openDatabase(new IDBFactory())
})

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
    name: 'مقارنة أطر الخصوصية',
    template: 'general',
    status: 'active',
    goal: 'أي إطار يناسب فريقًا صغيرًا؟',
    lastReached: 'ثلاثة أطر مرشحة',
    createdAt: 1000,
    updatedAt: 2000,
    lastWorkedAt: 2000,
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

/** يحوّل مساحة وصفحاتها إلى غلاف مُحقَّق، كما لو قُرئ من ملف. */
function envelopeOf(workspace: Workspace, pages: SavedPage[]) {
  const parsed = parseTransfer(serializeTransfer([{ workspace, pages }], 5000))
  if (!parsed.ok) throw new Error('تجهيزة الاختبار نفسها غير صالحة')
  return parsed.value
}

async function runImport(
  workspace: Workspace,
  pages: SavedPage[],
  resolution: ImportResolution,
) {
  return planAndWriteImport(db, makeIds(), {
    envelope: envelopeOf(workspace, pages),
    resolution,
  })
}

describe('الاستيراد بلا تعارض', () => {
  it('يكتب المساحة وصفحاتها كما وردت', async () => {
    const result = await runImport(makeWorkspace(), [makePage()], 'create-copy')

    expect(result.ok).toBe(true)
    const stored = await listWorkspaces(db)
    expect(stored.items).toHaveLength(1)
    expect(stored.items[0]?.name).toBe('مقارنة أطر الخصوصية')
  })

  it('يحفظ معرّف المساحة الوارد — فاستعادة النسخة أمينة', async () => {
    await runImport(makeWorkspace(), [], 'create-copy')

    expect((await readWorkspace(db, asWorkspaceId('w1'))).status).toBe('found')
  })

  it('يولّد معرفات صفحات جديدة — فلا تستبدل صفحةً تخص مساحة أخرى', async () => {
    // صفحة قائمة تحمل المعرّف نفسه الذي سيرد في الملف، لكنها تخص مساحة أخرى
    await writeWorkspaceWithPages(db, makeWorkspace({ id: asWorkspaceId('other'), name: 'جارة' }), [
      makePage({ id: asSavedPageId('p1'), workspaceId: asWorkspaceId('other'), title: 'الجارة' }),
    ])

    await runImport(makeWorkspace(), [makePage()], 'create-copy')

    const neighbour = await listPagesByWorkspace(db, asWorkspaceId('other'))
    expect(neighbour.items).toHaveLength(1)
    expect(neighbour.items[0]?.title).toBe('الجارة')
  })

  it('يعيد ربط التبويب النشط بمعرّفه الجديد', async () => {
    await runImport(makeWorkspace({ activePageId: asSavedPageId('p1') }), [makePage()], 'replace')

    const stored = await readWorkspace(db, asWorkspaceId('w1'))
    const pages = await listPagesByWorkspace(db, asWorkspaceId('w1'))

    expect(stored.status).toBe('found')
    if (stored.status === 'found') {
      expect(stored.value.activePageId).toBe(pages.items[0]?.id)
      expect(stored.value.activePageId).not.toBe('p1')
    }
  })

  it('لا يستبدل تواريخ المساحة بوقت الاستيراد', async () => {
    await runImport(makeWorkspace({ createdAt: 111, updatedAt: 222, lastWorkedAt: 222 }), [], 'replace')

    const stored = await readWorkspace(db, asWorkspaceId('w1'))
    if (stored.status === 'found') {
      expect(stored.value.createdAt).toBe(111)
      expect(stored.value.lastWorkedAt).toBe(222)
    } else {
      expect.unreachable('المساحة لم تُكتب')
    }
  })
})

describe('الخيارات الأربعة عند التعارض — §9.10', () => {
  beforeEach(async () => {
    await writeWorkspaceWithPages(db, makeWorkspace({ name: 'الاسم القائم', goal: 'هدف قائم' }), [
      makePage({ id: asSavedPageId('existing'), url: 'https://example.com/1', title: 'قائمة' }),
    ])
  })

  it('إنشاء نسخة: مساحة جديدة، والقائمة لا تُمس', async () => {
    const result = await runImport(
      makeWorkspace({ name: 'الوارد' }),
      [makePage({ url: 'https://example.com/2' })],
      'create-copy',
    )

    expect(result.ok).toBe(true)

    const all = await listWorkspaces(db)
    expect(all.items).toHaveLength(2)

    const original = await readWorkspace(db, asWorkspaceId('w1'))
    if (original.status === 'found') {
      expect(original.value.name).toBe('الاسم القائم')
      expect(original.value.goal).toBe('هدف قائم')
    }

    const originalPages = await listPagesByWorkspace(db, asWorkspaceId('w1'))
    expect(originalPages.items).toHaveLength(1)
  })

  it('الاستبدال: بيانات المساحة القائمة تُستبدل وصفحاتها القديمة تُحذف', async () => {
    await runImport(
      makeWorkspace({ name: 'الوارد', goal: 'هدف وارد' }),
      [makePage({ url: 'https://example.com/new', title: 'واردة' })],
      'replace',
    )

    expect((await listWorkspaces(db)).items).toHaveLength(1)

    const stored = await readWorkspace(db, asWorkspaceId('w1'))
    if (stored.status === 'found') {
      expect(stored.value.name).toBe('الوارد')
      expect(stored.value.goal).toBe('هدف وارد')
    }

    const pages = await listPagesByWorkspace(db, asWorkspaceId('w1'))
    expect(pages.items).toHaveLength(1)
    expect(pages.items[0]?.title).toBe('واردة')
  })

  it('دمج الصفحات: تُضاف غير المكررة وحدها', async () => {
    await runImport(
      makeWorkspace({ name: 'الوارد' }),
      [
        makePage({ id: asSavedPageId('dup'), url: 'https://example.com/1', title: 'مكررة' }),
        makePage({ id: asSavedPageId('fresh'), url: 'https://example.com/2', title: 'جديدة' }),
      ],
      'merge-pages',
    )

    const pages = await listPagesByWorkspace(db, asWorkspaceId('w1'))
    const titles = pages.items.map((page) => page.title)

    expect(pages.items).toHaveLength(2)
    expect(titles).toContain('قائمة')
    expect(titles).toContain('جديدة')
    expect(titles).not.toContain('مكررة')
  })

  it('الدمج يقارن بالرابط المطبَّع لا الحرفي', async () => {
    await runImport(
      makeWorkspace({ name: 'الوارد' }),
      // الرابط نفسه بمعامل تتبع وشرطة أخيرة — تطابق بعد التطبيع
      [makePage({ url: 'https://example.com/1/?utm_source=x' })],
      'merge-pages',
    )

    expect((await listPagesByWorkspace(db, asWorkspaceId('w1'))).items).toHaveLength(1)
  })

  it('الدمج لا يغيّر سجل المساحة القائمة — §9.10 يقول دمج الصفحات لا الحقول', async () => {
    await runImport(
      makeWorkspace({ name: 'الوارد', goal: 'هدف وارد', lastReached: 'نقطة واردة' }),
      [makePage({ url: 'https://example.com/2' })],
      'merge-pages',
    )

    const stored = await readWorkspace(db, asWorkspaceId('w1'))
    if (stored.status === 'found') {
      expect(stored.value.name).toBe('الاسم القائم')
      expect(stored.value.goal).toBe('هدف قائم')
      expect(stored.value.lastReached).toBe('ثلاثة أطر مرشحة')
    } else {
      expect.unreachable('المساحة اختفت')
    }
  })

  it('الإلغاء: لا يُكتب شيء إطلاقًا', async () => {
    const result = await runImport(
      makeWorkspace({ name: 'الوارد', goal: 'هدف وارد' }),
      [makePage({ url: 'https://example.com/2' })],
      'cancel',
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.imported).toBe(0)
      expect(result.value.skipped).toBe(1)
    }

    const stored = await readWorkspace(db, asWorkspaceId('w1'))
    if (stored.status === 'found') expect(stored.value.name).toBe('الاسم القائم')

    expect((await listPagesByWorkspace(db, asWorkspaceId('w1'))).items).toHaveLength(1)
    expect((await listWorkspaces(db)).items).toHaveLength(1)
  })

  it('التعارض يُكتشف بالاسم أيضًا لا بالمعرّف وحده', async () => {
    await runImport(
      makeWorkspace({ id: asWorkspaceId('different-id'), name: 'الاسم القائم' }),
      [],
      'cancel',
    )

    // لو لم يُكتشف التعارض بالاسم لأُنشئت مساحة ثانية
    expect((await listWorkspaces(db)).items).toHaveLength(1)
  })
})

describe('ذهاب وإياب عبر JSON', () => {
  it('تصدير ثم استيراد بلا فقد بيانات المستخدم', async () => {
    const workspace = makeWorkspace({
      description: 'وصف المهمة',
      generalNote: 'ملاحظة عامة',
      nextStep: 'الخطوة التالية',
      status: 'frozen',
      frozenAt: 3000,
    })
    const pages = [
      makePage({
        id: asSavedPageId('p1'),
        url: 'https://example.com/1',
        title: 'الأولى',
        reason: 'سبب الفتح',
        progressStatus: 'in-progress',
        role: 'primary',
        labels: ['مهمة', 'لاحقًا'],
        notes: [{ id: asPageNoteId('n1'), body: 'ملاحظتي', createdAt: 5, updatedAt: 6 }],
      }),
      makePage({ id: asSavedPageId('p2'), url: 'https://example.com/2', title: 'الثانية', order: 2048 }),
    ]

    // تصدير من قاعدة أولى
    await writeWorkspaceWithPages(db, workspace, pages)
    const listed = await listWorkspaces(db)
    const exportedPages = await listPagesByWorkspace(db, asWorkspaceId('w1'))
    const json = serializeTransfer(
      [{ workspace: listed.items[0]!, pages: exportedPages.items }],
      5000,
    )

    // استيراد إلى قاعدة نظيفة
    db = await openDatabase(new IDBFactory())
    const parsed = parseTransfer(json)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    await planAndWriteImport(db, makeIds(), {
      envelope: parsed.value,
      resolution: 'create-copy',
    })

    const restored = await readWorkspace(db, asWorkspaceId('w1'))
    const restoredPages = await listPagesByWorkspace(db, asWorkspaceId('w1'))

    expect(restored.status).toBe('found')
    if (restored.status === 'found') {
      expect(restored.value.name).toBe(workspace.name)
      expect(restored.value.goal).toBe(workspace.goal)
      expect(restored.value.description).toBe('وصف المهمة')
      expect(restored.value.generalNote).toBe('ملاحظة عامة')
      expect(restored.value.lastReached).toBe('ثلاثة أطر مرشحة')
      expect(restored.value.nextStep).toBe('الخطوة التالية')
      expect(restored.value.status).toBe('frozen')
      expect(restored.value.frozenAt).toBe(3000)
      expect(restored.value.createdAt).toBe(1000)
    }

    expect(restoredPages.items).toHaveLength(2)

    const first = restoredPages.items[0]
    expect(first?.title).toBe('الأولى')
    expect(first?.url).toBe('https://example.com/1')
    expect(first?.reason).toBe('سبب الفتح')
    expect(first?.progressStatus).toBe('in-progress')
    expect(first?.role).toBe('primary')
    expect(first?.labels).toEqual(['مهمة', 'لاحقًا'])
    expect(first?.notes).toHaveLength(1)
    expect(first?.notes[0]?.body).toBe('ملاحظتي')
    expect(first?.order).toBe(1024)
  })

  it('نسخة احتياطية بعدة مساحات تعود كاملة', async () => {
    const a = makeWorkspace({ id: asWorkspaceId('a'), name: 'الأولى' })
    const b = makeWorkspace({ id: asWorkspaceId('b'), name: 'الثانية' })

    await writeWorkspaceWithPages(db, a, [makePage({ id: asSavedPageId('pa'), workspaceId: a.id })])
    await writeWorkspaceWithPages(db, b, [makePage({ id: asSavedPageId('pb'), workspaceId: b.id })])

    const listed = await listWorkspaces(db)
    const entries = []
    for (const workspace of listed.items) {
      entries.push({ workspace, pages: (await listPagesByWorkspace(db, workspace.id)).items })
    }
    const json = serializeTransfer(entries, 5000)

    db = await openDatabase(new IDBFactory())
    const parsed = parseTransfer(json)
    if (!parsed.ok) throw new Error('الملف المصدَّر لا يُقرأ')

    const result = await planAndWriteImport(db, makeIds(), {
      envelope: parsed.value,
      resolution: 'create-copy',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.imported).toBe(2)
      expect(result.value.pagesImported).toBe(2)
    }
    expect((await listWorkspaces(db)).items).toHaveLength(2)
  })
})

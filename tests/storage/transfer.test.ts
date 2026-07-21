import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'

import { openDatabase } from '../../src/storage/database'
import {
  TRANSFER_FORMAT,
  TRANSFER_VERSION,
  parseTransfer,
  serializeTransfer,
  writeImportedWorkspaces,
} from '../../src/storage/transfer'
import { listPagesByWorkspace } from '../../src/storage/pages'
import { listWorkspaces, readWorkspace } from '../../src/storage/workspaces'
import { writeWorkspaceWithPages } from '../../src/storage/workspace-with-pages'
import { asPageNoteId, asSavedPageId, asWorkspaceId } from '../../src/core/ids'
import type { SavedPage } from '../../src/core/page'
import type { Workspace } from '../../src/core/workspace'

/**
 * الاستيراد أخطر مدخل في المنتج (§9.10): ملف يكتبه أي أحد ويُقرأ بلا ثقة.
 *
 * لذلك تثبت هذه الاختبارات ثلاثة أشياء قبل أي شيء آخر: أن كل ملف مشوّه يُرفض
 * بسبب منظَّم لا باستثناء ولا بقبول جزئي، وأن الرفض يقع **قبل** أي كتابة، وأن
 * الكتابة حين تقع ذرّية على مستوى الدفعة كلها.
 */

let db: IDBDatabase

beforeEach(async () => {
  db = await openDatabase(new IDBFactory())
})

function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: asWorkspaceId('w1'),
    name: 'مقارنة أطر الخصوصية',
    template: 'general',
    status: 'active',
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

/** يبني ملفًا صالحًا ثم يعدّل جزءًا منه — أساس اختبارات الرفض. */
function fileWith(mutate: (envelope: Record<string, unknown>) => void): string {
  const envelope = JSON.parse(
    serializeTransfer([{ workspace: makeWorkspace(), pages: [makePage()] }], 5000),
  ) as Record<string, unknown>
  mutate(envelope)
  return JSON.stringify(envelope)
}

describe('serializeTransfer — المخطط المعلَن', () => {
  it('يحمل الصيغة والإصدار ووقت التصدير', () => {
    const json = serializeTransfer([{ workspace: makeWorkspace(), pages: [] }], 5000)
    const parsed = JSON.parse(json) as Record<string, unknown>

    expect(parsed.format).toBe(TRANSFER_FORMAT)
    expect(parsed.version).toBe(TRANSFER_VERSION)
    expect(parsed.exportedAt).toBe(5000)
  })

  it('الصفحات مضمَّنة داخل مساحتها لا مسطّحة بمفتاح أجنبي', () => {
    const json = serializeTransfer(
      [{ workspace: makeWorkspace(), pages: [makePage(), makePage({ id: asSavedPageId('p2') })] }],
      5000,
    )
    const parsed = JSON.parse(json) as { workspaces: { pages: unknown[] }[] }

    expect(parsed.workspaces).toHaveLength(1)
    expect(parsed.workspaces[0]?.pages).toHaveLength(2)
  })

  it('نص مقروء بمسافات بادئة — الملف يُراجع بعين بشرية قبل مشاركته', () => {
    const json = serializeTransfer([{ workspace: makeWorkspace(), pages: [] }], 5000)
    expect(json).toContain('\n')
    expect(json.split('\n').length).toBeGreaterThan(5)
  })
})

describe('parseTransfer — رفض ما ليس ملفًا سليمًا', () => {
  it('نص ليس JSON', () => {
    const result = parseTransfer('{ليس جيسون')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.rejection.reason).toBe('not-json')
  })

  it('JSON صالح لكنه ليس كائنًا', () => {
    const result = parseTransfer('[1, 2, 3]')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.rejection.reason).toBe('not-an-object')
  })

  it('ملف بصيغة أخرى — لا يُؤوَّل تخمينًا', () => {
    const result = parseTransfer(JSON.stringify({ format: 'other.tool', version: 1 }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.rejection.reason).toBe('unknown-format')
  })

  it('إصدار مخطط لا يعرفه هذا البناء', () => {
    const result = parseTransfer(fileWith((envelope) => (envelope.version = 99)))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.rejection.reason).toBe('unsupported-version')
      if (result.rejection.reason === 'unsupported-version') {
        expect(result.rejection.found).toBe(99)
      }
    }
  })

  it('workspaces ليست قائمة', () => {
    const result = parseTransfer(fileWith((envelope) => (envelope.workspaces = {})))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.rejection.reason).toBe('workspaces-not-a-list')
  })

  it('مساحة تالفة تُرفض بموضعها واسم حقلها', () => {
    const result = parseTransfer(
      fileWith((envelope) => {
        const list = envelope.workspaces as { workspace: Record<string, unknown> }[]
        delete list[0]?.workspace.name
      }),
    )

    expect(result.ok).toBe(false)
    if (!result.ok && result.rejection.reason === 'invalid-workspace') {
      expect(result.rejection.workspaceIndex).toBe(0)
      expect(result.rejection.details).toBe('name')
    } else {
      expect.unreachable('توقّع رفض invalid-workspace')
    }
  })

  it('صفحة تالفة تُرفض بموضعها داخل مساحتها', () => {
    const result = parseTransfer(
      fileWith((envelope) => {
        const list = envelope.workspaces as { pages: Record<string, unknown>[] }[]
        const page = list[0]?.pages[0]
        if (page !== undefined) page.url = 42
      }),
    )

    expect(result.ok).toBe(false)
    if (!result.ok && result.rejection.reason === 'invalid-page') {
      expect(result.rejection.workspaceIndex).toBe(0)
      expect(result.rejection.pageIndex).toBe(0)
    } else {
      expect.unreachable('توقّع رفض invalid-page')
    }
  })

  it('صفحة تشير إلى مساحة أخرى — علاقة لا يكتشفها فحص السجل وحده', () => {
    const result = parseTransfer(
      fileWith((envelope) => {
        const list = envelope.workspaces as { pages: Record<string, unknown>[] }[]
        const page = list[0]?.pages[0]
        if (page !== undefined) page.workspaceId = 'other-workspace'
      }),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.rejection.reason).toBe('page-outside-workspace')
  })

  it('معرّف صفحة مكرر داخل المساحة — put كانت ستستبدل إحداهما صامتًا', () => {
    const result = parseTransfer(
      serializeTransfer(
        [{ workspace: makeWorkspace(), pages: [makePage(), makePage()] }],
        5000,
      ),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.rejection.reason).toBe('duplicate-page-id')
  })

  it('activePageId يشير إلى صفحة غير موجودة في الملف', () => {
    const result = parseTransfer(
      serializeTransfer(
        [
          {
            workspace: makeWorkspace({ activePageId: asSavedPageId('ghost') }),
            pages: [makePage()],
          },
        ],
        5000,
      ),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.rejection.reason).toBe('active-page-missing')
  })

  it('حقول زائدة لا يعرفها المخطط لا تُنقل إلى النموذج', () => {
    const result = parseTransfer(
      fileWith((envelope) => {
        const list = envelope.workspaces as { workspace: Record<string, unknown> }[]
        const workspace = list[0]?.workspace
        if (workspace !== undefined) workspace.__proto__hack = 'x'
      }),
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(Object.keys(result.value.workspaces[0]?.workspace ?? {})).not.toContain(
        '__proto__hack',
      )
    }
  })
})

describe('parseTransfer — الملف السليم', () => {
  it('يقبل ملفًا صحيحًا ويعيد مساحاته وصفحاتها', () => {
    const result = parseTransfer(
      serializeTransfer([{ workspace: makeWorkspace(), pages: [makePage()] }], 5000),
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.workspaces).toHaveLength(1)
      expect(result.value.workspaces[0]?.workspace.name).toBe('مقارنة أطر الخصوصية')
      expect(result.value.workspaces[0]?.pages).toHaveLength(1)
    }
  })

  it('ملف بلا مساحات مقبول — نسخة احتياطية فارغة ليست فاسدة', () => {
    const result = parseTransfer(serializeTransfer([], 5000))

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.workspaces).toEqual([])
  })

  it('يحفظ الملاحظات المضمَّنة كما هي', () => {
    const page = makePage({
      notes: [{ id: asPageNoteId('n1'), body: 'ملاحظتي', createdAt: 1, updatedAt: 1 }],
    })
    const result = parseTransfer(
      serializeTransfer([{ workspace: makeWorkspace(), pages: [page] }], 5000),
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.workspaces[0]?.pages[0]?.notes[0]?.body).toBe('ملاحظتي')
    }
  })
})

describe('writeImportedWorkspaces — الذرّية', () => {
  it('يكتب دفعة كاملة من مساحات متعددة', async () => {
    const result = await writeImportedWorkspaces(db, [
      { workspace: makeWorkspace(), pages: [makePage()], replaceExistingPages: false },
      {
        workspace: makeWorkspace({ id: asWorkspaceId('w2'), name: 'أخرى' }),
        pages: [makePage({ id: asSavedPageId('p2'), workspaceId: asWorkspaceId('w2') })],
        replaceExistingPages: false,
      },
    ])

    expect(result.ok).toBe(true)
    expect((await listWorkspaces(db)).items).toHaveLength(2)
  })

  it('سجل واحد غير صالح يمنع كتابة الدفعة كلها — لا استيراد جزئي', async () => {
    const result = await writeImportedWorkspaces(db, [
      { workspace: makeWorkspace(), pages: [makePage()], replaceExistingPages: false },
      {
        // اسم فارغ: يرفضه التحقق قبل فتح أي معاملة
        workspace: makeWorkspace({ id: asWorkspaceId('w2'), name: '   ' }),
        pages: [],
        replaceExistingPages: false,
      },
    ])

    expect(result.ok).toBe(false)
    // ولا حتى المساحة الأولى الصحيحة كُتبت
    expect((await listWorkspaces(db)).items).toEqual([])
  })

  it('معرّف مساحة مكرر عبر الدفعة يُرفض', async () => {
    const result = await writeImportedWorkspaces(db, [
      { workspace: makeWorkspace(), pages: [], replaceExistingPages: false },
      { workspace: makeWorkspace({ name: 'اسم آخر' }), pages: [], replaceExistingPages: false },
    ])

    expect(result.ok).toBe(false)
    expect((await listWorkspaces(db)).items).toEqual([])
  })

  it('معرّف صفحة مكرر عبر مساحتين مختلفتين يُرفض — تصادم عابر للمساحات', async () => {
    const result = await writeImportedWorkspaces(db, [
      { workspace: makeWorkspace(), pages: [makePage()], replaceExistingPages: false },
      {
        workspace: makeWorkspace({ id: asWorkspaceId('w2'), name: 'أخرى' }),
        pages: [makePage({ workspaceId: asWorkspaceId('w2') })],
        replaceExistingPages: false,
      },
    ])

    expect(result.ok).toBe(false)
    expect((await listWorkspaces(db)).items).toEqual([])
  })

  it('صفحة تشير إلى مساحة أخرى تُرفض قبل الكتابة', async () => {
    const result = await writeImportedWorkspaces(db, [
      {
        workspace: makeWorkspace(),
        pages: [makePage({ workspaceId: asWorkspaceId('elsewhere') })],
        replaceExistingPages: false,
      },
    ])

    expect(result.ok).toBe(false)
    expect((await listWorkspaces(db)).items).toEqual([])
  })
})

describe('writeImportedWorkspaces — الاستبدال', () => {
  beforeEach(async () => {
    await writeWorkspaceWithPages(db, makeWorkspace(), [
      makePage({ id: asSavedPageId('old1'), url: 'https://old.example/1' }),
      makePage({ id: asSavedPageId('old2'), url: 'https://old.example/2' }),
    ])
  })

  it('يحذف صفحات المساحة القائمة قبل كتابة الواردة', async () => {
    await writeImportedWorkspaces(db, [
      {
        workspace: makeWorkspace({ name: 'بعد الاستبدال' }),
        pages: [makePage({ id: asSavedPageId('new1'), url: 'https://new.example/1' })],
        replaceExistingPages: true,
      },
    ])

    const pages = await listPagesByWorkspace(db, asWorkspaceId('w1'))

    expect(pages.items).toHaveLength(1)
    expect(pages.items[0]?.url).toBe('https://new.example/1')
  })

  it('بلا استبدال تبقى الصفحات القديمة وتُضاف الجديدة — دمج', async () => {
    await writeImportedWorkspaces(db, [
      {
        workspace: makeWorkspace(),
        pages: [makePage({ id: asSavedPageId('new1'), url: 'https://new.example/1' })],
        replaceExistingPages: false,
      },
    ])

    const pages = await listPagesByWorkspace(db, asWorkspaceId('w1'))

    expect(pages.items).toHaveLength(3)
  })

  it('الاستبدال لا يمس مساحة أخرى ولا صفحاتها', async () => {
    await writeWorkspaceWithPages(db, makeWorkspace({ id: asWorkspaceId('w2'), name: 'جارة' }), [
      makePage({ id: asSavedPageId('n1'), workspaceId: asWorkspaceId('w2') }),
    ])

    await writeImportedWorkspaces(db, [
      {
        workspace: makeWorkspace(),
        pages: [makePage({ id: asSavedPageId('new1') })],
        replaceExistingPages: true,
      },
    ])

    const neighbour = await listPagesByWorkspace(db, asWorkspaceId('w2'))
    expect(neighbour.items).toHaveLength(1)
    expect((await readWorkspace(db, asWorkspaceId('w2'))).status).toBe('found')
  })
})

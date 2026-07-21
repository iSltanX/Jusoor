import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PAGE_FILTERS,
  DEFAULT_PAGE_SORT,
  filterPages,
  isDefaultFilters,
  isPlainView,
  organizePages,
  sortPages,
  type PageFilters,
} from '../../src/core/page-organization'
import { toSearchTerms } from '../../src/core/search'
import { asPageNoteId, asSavedPageId, asWorkspaceId } from '../../src/core/ids'
import type { SavedPage } from '../../src/core/page'

/**
 * التنظيم عرضٌ لا تحرير — دستور المنتج §9.4.
 *
 * أهم ما تثبته هذه الاختبارات ليس ترتيبًا صحيحًا فحسب، بل **ألا شيء يتغيّر**:
 * لا المصفوفة الممرَّرة، ولا أي حقل داخل أي صفحة. إعادة الترتيب المحفوظة فعليًا
 * عملية أخرى تمامًا (`reorderPages` في app/) تكتب `order` بطلب صريح.
 */

const WORKSPACE_ID = asWorkspaceId('w1')

function page(id: string, overrides: Partial<SavedPage> = {}): SavedPage {
  return {
    id: asSavedPageId(id),
    workspaceId: WORKSPACE_ID,
    url: `https://example.com/${id}`,
    title: `صفحة ${id}`,
    capturedAt: 1000,
    order: 1024,
    progressStatus: 'not-started',
    notes: [],
    addedAt: 1000,
    updatedAt: 1000,
    ...overrides,
  }
}

const withNote = (id: string, overrides: Partial<SavedPage> = {}): SavedPage =>
  page(id, {
    notes: [{ id: asPageNoteId(`n-${id}`), body: 'ملاحظة', createdAt: 1, updatedAt: 1 }],
    ...overrides,
  })

const ids = (pages: readonly SavedPage[]): string[] => pages.map((item) => item.id)

describe('sortPages — لا تعديل للمدخل', () => {
  it('لا تعدّل المصفوفة الممرَّرة (sort يعدّل في مكانه لولا النسخ)', () => {
    const pages = [page('a', { order: 3000 }), page('b', { order: 1000 })]
    const snapshot = ids(pages)

    sortPages(pages, 'original')

    expect(ids(pages)).toEqual(snapshot)
  })

  it('تعيد مصفوفة جديدة لا المرجع نفسه', () => {
    const pages = [page('a')]
    expect(sortPages(pages, 'original')).not.toBe(pages)
  })

  it('لا تعدّل أي حقل داخل أي صفحة — الكائنات تُمرَّر بمراجعها كما هي', () => {
    const original = page('a', { order: 2048, role: 'primary' })
    const [sorted] = sortPages([original], 'importance')

    expect(sorted).toBe(original)
    expect(original.order).toBe(2048)
    expect(original.role).toBe('primary')
  })
})

describe('sortPages — الترتيب الأصلي', () => {
  it('يرتب بـ order تصاعديًا', () => {
    const pages = [page('c', { order: 3072 }), page('a', { order: 1024 }), page('b', { order: 2048 })]
    expect(ids(sortPages(pages, 'original'))).toEqual(['a', 'b', 'c'])
  })

  it('يحسم تعادل order بـ addedAt ثم المعرّف', () => {
    const pages = [
      page('z', { order: 1024, addedAt: 500 }),
      page('a', { order: 1024, addedAt: 500 }),
      page('m', { order: 1024, addedAt: 100 }),
    ]
    expect(ids(sortPages(pages, 'original'))).toEqual(['m', 'a', 'z'])
  })
})

describe('sortPages — تاريخ الإضافة', () => {
  it('الأحدث إضافةً أولًا', () => {
    const pages = [
      page('old', { addedAt: 100 }),
      page('new', { addedAt: 900 }),
      page('mid', { addedAt: 500 }),
    ]
    expect(ids(sortPages(pages, 'added'))).toEqual(['new', 'mid', 'old'])
  })

  it('التعادل يعود إلى الترتيب الأصلي', () => {
    const pages = [
      page('b', { addedAt: 500, order: 2048 }),
      page('a', { addedAt: 500, order: 1024 }),
    ]
    expect(ids(sortPages(pages, 'added'))).toEqual(['a', 'b'])
  })
})

describe('sortPages — الأهمية', () => {
  it('الأساسية أولًا، ثم غيرها، والمستبعدة أخيرًا', () => {
    const pages = [
      page('excluded', { role: 'excluded', order: 1024 }),
      page('none', { order: 2048 }),
      page('primary', { role: 'primary', order: 3072 }),
      page('supporting', { role: 'supporting', order: 4096 }),
    ]

    expect(ids(sortPages(pages, 'importance'))).toEqual([
      'primary',
      'none',
      'supporting',
      'excluded',
    ])
  })

  it('المتساوية في الرتبة تبقى بالترتيب الأصلي', () => {
    const pages = [
      page('b', { role: 'primary', order: 2048 }),
      page('a', { role: 'primary', order: 1024 }),
    ]
    expect(ids(sortPages(pages, 'importance'))).toEqual(['a', 'b'])
  })
})

describe('filterPages', () => {
  const pages = [
    page('a', { progressStatus: 'complete', role: 'primary' }),
    page('b', { progressStatus: 'in-progress', role: 'supporting' }),
    withNote('c', { progressStatus: 'not-started' }),
    page('d', { progressStatus: 'complete' }),
  ]

  it('الافتراضي لا يصفّي شيئًا', () => {
    expect(ids(filterPages(pages, DEFAULT_PAGE_FILTERS))).toEqual(['a', 'b', 'c', 'd'])
  })

  it('يصفّي بحالة التقدم', () => {
    expect(ids(filterPages(pages, { ...DEFAULT_PAGE_FILTERS, progress: 'complete' }))).toEqual([
      'a',
      'd',
    ])
  })

  it('يصفّي بالدور', () => {
    expect(ids(filterPages(pages, { ...DEFAULT_PAGE_FILTERS, role: 'primary' }))).toEqual(['a'])
  })

  it('«لم يُصنَّف بعد» يلتقط غياب الدور — حالة حقيقية لا نقص يُخفى', () => {
    expect(ids(filterPages(pages, { ...DEFAULT_PAGE_FILTERS, role: 'unclassified' }))).toEqual([
      'c',
      'd',
    ])
  })

  it('يصفّي بوجود ملاحظات', () => {
    expect(ids(filterPages(pages, { ...DEFAULT_PAGE_FILTERS, withNotesOnly: true }))).toEqual(['c'])
  })

  it('البعدان يجتمعان دون أن يُدمجا في قائمة واحدة — §10.3 هوية', () => {
    const filters: PageFilters = {
      progress: 'complete',
      role: 'primary',
      withNotesOnly: false,
    }
    expect(ids(filterPages(pages, filters))).toEqual(['a'])
  })

  it('لا يعدّل المصفوفة الممرَّرة', () => {
    const snapshot = ids(pages)
    filterPages(pages, { ...DEFAULT_PAGE_FILTERS, progress: 'complete' })
    expect(ids(pages)).toEqual(snapshot)
  })
})

describe('isDefaultFilters و isPlainView', () => {
  it('الافتراضي يُعرف افتراضيًا', () => {
    expect(isDefaultFilters(DEFAULT_PAGE_FILTERS)).toBe(true)
  })

  it('أي مرشِّح مضبوط يخرجه عن الافتراضي', () => {
    expect(isDefaultFilters({ ...DEFAULT_PAGE_FILTERS, progress: 'complete' })).toBe(false)
    expect(isDefaultFilters({ ...DEFAULT_PAGE_FILTERS, role: 'unclassified' })).toBe(false)
    expect(isDefaultFilters({ ...DEFAULT_PAGE_FILTERS, withNotesOnly: true })).toBe(false)
  })

  it('العرض كامل حين لا بحث ولا تصفية ولا ترتيب مختلف', () => {
    expect(
      isPlainView({ terms: [], filters: DEFAULT_PAGE_FILTERS, sort: DEFAULT_PAGE_SORT }),
    ).toBe(true)
  })

  it('أي من الثلاثة يُخرجه عن العرض الكامل', () => {
    const base = { terms: [], filters: DEFAULT_PAGE_FILTERS, sort: DEFAULT_PAGE_SORT } as const

    expect(isPlainView({ ...base, terms: ['بحث'] })).toBe(false)
    expect(isPlainView({ ...base, filters: { ...DEFAULT_PAGE_FILTERS, withNotesOnly: true } })).toBe(
      false,
    )
    expect(isPlainView({ ...base, sort: 'added' })).toBe(false)
  })
})

describe('organizePages — البحث ثم التصفية ثم الترتيب', () => {
  const pages = [
    page('a', { title: 'دليل الخصوصية', order: 1024, progressStatus: 'complete' }),
    page('b', { title: 'مقارنة الأطر', order: 2048, progressStatus: 'in-progress' }),
    page('c', { title: 'الخصوصية في الأنظمة', order: 3072, progressStatus: 'in-progress' }),
  ]

  it('بلا بحث ولا تصفية يعيد الكل بالترتيب الأصلي', () => {
    expect(
      ids(organizePages(pages, { terms: [], filters: DEFAULT_PAGE_FILTERS, sort: 'original' })),
    ).toEqual(['a', 'b', 'c'])
  })

  it('البحث يضيّق النتيجة', () => {
    expect(
      ids(
        organizePages(pages, {
          terms: toSearchTerms('الخصوصية'),
          filters: DEFAULT_PAGE_FILTERS,
          sort: 'original',
        }),
      ),
    ).toEqual(['a', 'c'])
  })

  it('البحث والتصفية يجتمعان', () => {
    expect(
      ids(
        organizePages(pages, {
          terms: toSearchTerms('الخصوصية'),
          filters: { ...DEFAULT_PAGE_FILTERS, progress: 'in-progress' },
          sort: 'original',
        }),
      ),
    ).toEqual(['c'])
  })

  it('الترتيب يُطبَّق على ما بقي بعد التضييق لا على القائمة الكاملة', () => {
    const organized = organizePages(pages, {
      terms: toSearchTerms('الخصوصية'),
      filters: DEFAULT_PAGE_FILTERS,
      sort: 'added',
    })

    expect(ids(organized)).toEqual(['a', 'c'])
    expect(organized).toHaveLength(2)
  })

  it('لا نتائج ليست خطأ — قائمة فارغة صريحة', () => {
    expect(
      organizePages(pages, {
        terms: toSearchTerms('تشفير'),
        filters: DEFAULT_PAGE_FILTERS,
        sort: 'original',
      }),
    ).toEqual([])
  })

  it('لا يعدّل المصفوفة الممرَّرة ولا أي صفحة فيها', () => {
    const snapshot = pages.map((item) => ({ id: item.id, order: item.order, title: item.title }))

    organizePages(pages, {
      terms: toSearchTerms('الخصوصية'),
      filters: { ...DEFAULT_PAGE_FILTERS, progress: 'complete' },
      sort: 'importance',
    })

    expect(pages.map((item) => ({ id: item.id, order: item.order, title: item.title }))).toEqual(
      snapshot,
    )
  })
})

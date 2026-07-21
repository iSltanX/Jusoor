import { describe, expect, it } from 'vitest'

import {
  allSelected,
  clearSelection,
  draftGoal,
  hasErrors,
  isSelected,
  selectAll,
  selectedTabs,
  startDraft,
  toggleSelection,
  validateDraft,
  withGoal,
  withName,
} from '../../src/ui/create-workspace-flow'
import type { BrowserTabSnapshot } from '../../src/core/browser-tab'

function tab(overrides: Partial<BrowserTabSnapshot> = {}): BrowserTabSnapshot {
  return { title: 'عنوان', url: 'https://example.com/1', index: 0, active: false, ...overrides }
}

const threeTabs: BrowserTabSnapshot[] = [
  tab({ title: 'أول', url: 'https://example.com/1', index: 0 }),
  tab({ title: 'ثانٍ', url: 'https://example.com/2', index: 1, active: true }),
  tab({ title: 'ثالث', url: 'https://example.com/3', index: 2 }),
]

describe('startDraft', () => {
  it('لا يختار شيئًا مسبقًا — ولا حتى التبويب النشط', () => {
    const draft = startDraft(threeTabs, [])

    expect(draft.selected.size).toBe(0)
    expect(selectedTabs(draft)).toEqual([])
  })

  it('يبدأ باسم وهدف فارغين', () => {
    const draft = startDraft(threeTabs, [])

    expect(draft.name).toBe('')
    expect(draft.goal).toBe('')
  })

  it('يحتفظ بالتبويبات غير المتاحة كما وصلت — لا تختفي', () => {
    const draft = startDraft(threeTabs, [{ index: 7, reason: 'missing-url' }])

    expect(draft.unavailable).toEqual([{ index: 7, reason: 'missing-url' }])
  })
})

describe('اختيار التبويبات', () => {
  it('يختار تبويبًا واحدًا', () => {
    const draft = toggleSelection(startDraft(threeTabs, []), 1)

    expect(isSelected(draft, 1)).toBe(true)
    expect(selectedTabs(draft).map((t) => t.title)).toEqual(['ثانٍ'])
  })

  it('يختار عدة تبويبات', () => {
    let draft = startDraft(threeTabs, [])
    draft = toggleSelection(draft, 0)
    draft = toggleSelection(draft, 2)

    expect(selectedTabs(draft).map((t) => t.title)).toEqual(['أول', 'ثالث'])
  })

  it('يلغي اختيار تبويب مختار', () => {
    let draft = toggleSelection(startDraft(threeTabs, []), 1)
    draft = toggleSelection(draft, 1)

    expect(isSelected(draft, 1)).toBe(false)
    expect(draft.selected.size).toBe(0)
  })

  it('المختارة تعود بترتيب النافذة لا بترتيب النقر', () => {
    let draft = startDraft(threeTabs, [])
    draft = toggleSelection(draft, 2)
    draft = toggleSelection(draft, 0)
    draft = toggleSelection(draft, 1)

    expect(selectedTabs(draft).map((t) => t.index)).toEqual([0, 1, 2])
  })

  it('اختيار الكل ثم إلغاؤه', () => {
    const all = selectAll(startDraft(threeTabs, []))
    expect(allSelected(all)).toBe(true)
    expect(selectedTabs(all)).toHaveLength(3)

    const none = clearSelection(all)
    expect(allSelected(none)).toBe(false)
    expect(none.selected.size).toBe(0)
  })

  it('يتجاهل موضعًا خارج النطاق بلا تغيير', () => {
    const draft = startDraft(threeTabs, [])

    expect(toggleSelection(draft, 9)).toBe(draft)
    expect(toggleSelection(draft, -1)).toBe(draft)
  })

  it('لا يعدّل المسودة الأصلية (نقاء الدوال)', () => {
    const draft = startDraft(threeTabs, [])
    toggleSelection(draft, 0)
    selectAll(draft)

    expect(draft.selected.size).toBe(0)
  })

  it('allSelected لقائمة فارغة = false، لا true بحكم الفراغ', () => {
    expect(allSelected(startDraft([], []))).toBe(false)
  })
})

describe('validateDraft', () => {
  it('يرفض اسمًا فارغًا', () => {
    const draft = toggleSelection(startDraft(threeTabs, []), 0)

    expect(validateDraft(draft).name).toBe('required')
  })

  it('يرفض اسمًا من مسافات وحدها', () => {
    let draft = toggleSelection(startDraft(threeTabs, []), 0)
    draft = withName(draft, '   ')

    expect(validateDraft(draft).name).toBe('required')
  })

  it('يرفض غياب أي اختيار', () => {
    const draft = withName(startDraft(threeTabs, []), 'مساحة')

    expect(validateDraft(draft).selection).toBe('required')
  })

  it('يعيد الخطأين معًا لا أولهما فقط', () => {
    const errors = validateDraft(startDraft(threeTabs, []))

    expect(errors).toEqual({ name: 'required', selection: 'required' })
    expect(hasErrors(errors)).toBe(true)
  })

  it('يقبل مسودة باسم واختيار — والهدف اختياري', () => {
    let draft = toggleSelection(startDraft(threeTabs, []), 0)
    draft = withName(draft, 'مساحة')

    expect(hasErrors(validateDraft(draft))).toBe(false)
  })
})

describe('draftGoal', () => {
  it('الهدف الفارغ يعني الغياب فلا يُرسل', () => {
    expect(draftGoal(startDraft(threeTabs, []))).toBeUndefined()
    expect(draftGoal(withGoal(startDraft(threeTabs, []), '   '))).toBeUndefined()
  })

  it('الهدف المكتوب يُرسل بعد trim فقط', () => {
    expect(draftGoal(withGoal(startDraft(threeTabs, []), '  سؤالي  '))).toBe('سؤالي')
  })
})

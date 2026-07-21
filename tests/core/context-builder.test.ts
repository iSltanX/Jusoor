import { describe, expect, it } from 'vitest'

import {
  CONTEXT_LEVELS,
  CONTEXT_TEMPLATES,
  LARGE_CONTEXT_CHARACTERS,
  LINK_DISPLAYS,
  buildContext,
  countText,
  isLargeContext,
  presetForLevel,
  splitContext,
  type ContextInput,
  type ContextLabels,
} from '../../src/core/context-builder'
import { asPageNoteId, asSavedPageId, asWorkspaceId } from '../../src/core/ids'
import type { SavedPage } from '../../src/core/page'
import type { Workspace } from '../../src/core/workspace'

/**
 * منشئ السياق — §9.6 و§9.7 و§9.8.
 *
 * أهم ما تثبته هذه الاختبارات ليس شكل النص، بل ثلاثة التزامات دستورية:
 * أن الاختصار يقلّل أنواع البيانات ولا يعيد الكتابة، وأن محتوى المستخدم يخرج
 * حرفيًا بلا ترجمة أو قص، وأن الدالة عاجزة بنيويًا عن إرسال أي شيء.
 */

const WORKSPACE_ID = asWorkspaceId('w1')

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: WORKSPACE_ID,
    name: 'مقارنة أطر الخصوصية',
    template: 'general',
    status: 'active',
    createdAt: 1000,
    updatedAt: 1000,
    lastWorkedAt: 1000,
    ...overrides,
  }
}

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

const note = (id: string, body: string) => ({
  id: asPageNoteId(id),
  body,
  createdAt: 1,
  updatedAt: 1,
})

/** عناوين اصطناعية مميّزة، فيُعرف أي عنوان ظهر دون الاعتماد على قاموس حقيقي. */
const LABELS: ContextLabels = {
  workspace: 'WS',
  request: 'REQ',
  goal: 'GOAL',
  description: 'DESC',
  generalNote: 'GNOTE',
  lastReached: 'LAST',
  nextStep: 'NEXT',
  pages: 'PAGES',
  reason: 'REASON',
  progress: 'PROG',
  role: 'ROLE',
  notes: 'NOTE',
  part: 'P{index}/{total}',
  progressValues: {
    'not-started': 'PS0',
    'in-progress': 'PS1',
    paused: 'PS2',
    complete: 'PS3',
  },
  roleValues: {
    primary: 'R-PRIMARY',
    supporting: 'R-SUPPORTING',
    verify: 'R-VERIFY',
    excluded: 'R-EXCLUDED',
  },
}

function input(overrides: Partial<ContextInput> = {}): ContextInput {
  return {
    workspace: workspace(),
    pages: [],
    includes: presetForLevel('detailed').includes,
    notesScope: 'all',
    linkDisplay: 'title-and-url',
    request: '',
    ...overrides,
  }
}

const build = (overrides: Partial<ContextInput> = {}) => buildContext(input(overrides), LABELS)

describe('الحدود الدستورية للمنشئ', () => {
  it('لا تملك الدالة منفذًا تُرسل عبره شيئًا — نص فقط', () => {
    const result = build()
    expect(typeof result.text).toBe('string')
    // توقيعها (مدخل، عناوين) => نص: لا قاعدة بيانات ولا شبكة ولا تخزين
    expect(buildContext.length).toBe(2)
  })

  it('لا تعدّل المدخل ولا المساحة ولا الصفحات', () => {
    const ws = workspace({ goal: 'هدف' })
    const pages = [page('p1', { title: 'عنوان' })]
    const snapshot = JSON.stringify({ ws, pages })

    buildContext(input({ workspace: ws, pages }), LABELS)

    expect(JSON.stringify({ ws, pages })).toBe(snapshot)
  })
})

describe('محتوى المستخدم يخرج حرفيًا', () => {
  it('لا يُترجم ولا يُعاد صياغته ولا يُقص', () => {
    const long = 'نص طويل جدًا '.repeat(40).trim()
    const result = build({
      workspace: workspace({ goal: long, lastReached: 'Three candidates shortlisted' }),
    })

    expect(result.text).toContain(long)
    expect(result.text).toContain('Three candidates shortlisted')
  })

  it('عناوين الصفحات وروابطها تخرج كما حُفظت', () => {
    const result = build({
      pages: [page('p1', { title: 'GDPR checklist', url: 'https://gdpr.eu/checklist?a=1' })],
    })

    expect(result.text).toContain('GDPR checklist')
    expect(result.text).toContain('https://gdpr.eu/checklist?a=1')
  })

  it('التشكيل في نص المستخدم لا يُمس', () => {
    const result = build({ workspace: workspace({ goal: 'الخُصوصيّة' }) })
    expect(result.text).toContain('الخُصوصيّة')
  })
})

describe('المستويات الثلاثة — §9.6', () => {
  it('لكل مستوى إعداد معرَّف', () => {
    for (const level of CONTEXT_LEVELS) {
      expect(presetForLevel(level).includes).toBeDefined()
    }
  })

  it('presetForLevel يعيد نسخة فلا يُفسد الجدول الثابت', () => {
    const first = presetForLevel('brief')
    first.includes.goal = false

    expect(presetForLevel('brief').includes.goal).toBe(true)
  })

  it('المختصر ينقل §9.6 حرفيًا: الهدف والصفحات وأهم الملاحظات ونقطة التوقف', () => {
    const preset = presetForLevel('brief')

    expect(preset.includes.goal).toBe(true)
    expect(preset.includes.pages).toBe(true)
    expect(preset.includes.notes).toBe(true)
    expect(preset.includes.checkpoint).toBe(true)
    expect(preset.notesScope).toBe('important')

    // وما ليس في نص §9.6 للمختصر
    expect(preset.includes.description).toBe(false)
    expect(preset.includes.generalNote).toBe(false)
    expect(preset.includes.reasons).toBe(false)
    expect(preset.includes.progress).toBe(false)
    expect(preset.includes.roles).toBe(false)
  })

  it('المفصّل يضمّن كل الأنواع', () => {
    const includes = presetForLevel('detailed').includes
    expect(Object.values(includes).every(Boolean)).toBe(true)
  })

  it('الاختصار يقلّل أنواع البيانات ولا يعيد كتابة النص', () => {
    const ws = workspace({
      goal: 'الهدف الأصلي',
      description: 'الوصف الأصلي',
      lastReached: 'آخر ما وصلت إليه',
    })

    const brief = buildContext(
      input({ workspace: ws, includes: presetForLevel('brief').includes }),
      LABELS,
    )
    const detailed = buildContext(
      input({ workspace: ws, includes: presetForLevel('detailed').includes }),
      LABELS,
    )

    // الوصف اختفى بالكامل من المختصر — لم يُلخَّص
    expect(detailed.text).toContain('الوصف الأصلي')
    expect(brief.text).not.toContain('الوصف الأصلي')

    // وما بقي بقي حرفيًا كما هو في المفصّل، بلا إعادة صياغة
    expect(brief.text).toContain('الهدف الأصلي')
    expect(brief.text).toContain('آخر ما وصلت إليه')
  })

  it('«أهم الملاحظات» في المختصر = ملاحظات الصفحات الأساسية وحدها', () => {
    const pages = [
      page('p1', { role: 'primary', notes: [note('n1', 'ملاحظة أساسية')] }),
      page('p2', { role: 'supporting', notes: [note('n2', 'ملاحظة داعمة')] }),
    ]

    const brief = buildContext(
      input({
        pages,
        includes: presetForLevel('brief').includes,
        notesScope: presetForLevel('brief').notesScope,
      }),
      LABELS,
    )

    expect(brief.text).toContain('ملاحظة أساسية')
    expect(brief.text).not.toContain('ملاحظة داعمة')
  })

  it('نطاق «الكل» يضمّن ملاحظات كل الصفحات', () => {
    const pages = [
      page('p1', { role: 'primary', notes: [note('n1', 'ملاحظة أساسية')] }),
      page('p2', { role: 'supporting', notes: [note('n2', 'ملاحظة داعمة')] }),
    ]

    const result = buildContext(input({ pages, notesScope: 'all' }), LABELS)

    expect(result.text).toContain('ملاحظة أساسية')
    expect(result.text).toContain('ملاحظة داعمة')
  })
})

describe('مفاتيح التضمين تُطفئ أقسامها فعلًا', () => {
  const ws = workspace({
    goal: 'GOALVALUE',
    description: 'DESCVALUE',
    generalNote: 'GNOTEVALUE',
    lastReached: 'LASTVALUE',
    nextStep: 'NEXTVALUE',
  })

  const cases: [keyof ContextInput['includes'], string][] = [
    ['goal', 'GOALVALUE'],
    ['description', 'DESCVALUE'],
    ['generalNote', 'GNOTEVALUE'],
  ]

  it.each(cases)('إطفاء %s يزيل قيمته', (key, value) => {
    const includes = { ...presetForLevel('detailed').includes, [key]: false }
    const result = buildContext(input({ workspace: ws, includes }), LABELS)

    expect(result.text).not.toContain(value)
  })

  it('إطفاء نقطة التوقف يزيل الحقلين معًا', () => {
    const includes = { ...presetForLevel('detailed').includes, checkpoint: false }
    const result = buildContext(input({ workspace: ws, includes }), LABELS)

    expect(result.text).not.toContain('LASTVALUE')
    expect(result.text).not.toContain('NEXTVALUE')
  })

  it('إطفاء الصفحات يزيل قسمها كاملًا', () => {
    const includes = { ...presetForLevel('detailed').includes, pages: false }
    const result = buildContext(input({ pages: [page('p1')], includes }), LABELS)

    expect(result.text).not.toContain('PAGES')
    expect(result.counts.pages).toBe(0)
  })

  it('إطفاء المطلوب يزيل نصه', () => {
    const includes = { ...presetForLevel('detailed').includes, request: false }
    const result = buildContext(input({ request: 'REQUESTVALUE', includes }), LABELS)

    expect(result.text).not.toContain('REQUESTVALUE')
  })

  it('الحقل الغائب لا يترك عنوانًا فارغًا', () => {
    const result = build({ workspace: workspace() })

    expect(result.text).not.toContain('GOAL:')
    expect(result.text).not.toContain('LAST:')
  })

  it('اسم المساحة ترويسة هوية تتصدر أي سياق له محتوى — §9.6', () => {
    const result = build({ workspace: workspace({ goal: 'هدف' }) })

    expect(result.text.startsWith('WS: مقارنة أطر الخصوصية')).toBe(true)
  })
})

describe('ترتيب الأقسام', () => {
  it('المطلوب أولًا بوصفه المقدمة (§9.8)، ثم الهدف، ثم نقطة التوقف، ثم الصفحات', () => {
    const result = build({
      workspace: workspace({ goal: 'GOALVALUE', lastReached: 'LASTVALUE' }),
      pages: [page('p1')],
      request: 'REQUESTVALUE',
    })

    const order = ['REQUESTVALUE', 'GOALVALUE', 'LASTVALUE', 'PAGES'].map((needle) =>
      result.text.indexOf(needle),
    )

    expect(order.every((index) => index >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it('ترتيب الصفحات هو الترتيب الممرَّر لا ترتيب المساحة — §9.8', () => {
    const pages = [
      page('b', { title: 'الثانية', order: 4096 }),
      page('a', { title: 'الأولى', order: 1024 }),
    ]

    const result = build({ pages })

    expect(result.text.indexOf('الثانية')).toBeLessThan(result.text.indexOf('الأولى'))
  })

  it('الصفحات مرقّمة بترتيب ظهورها', () => {
    const result = build({ pages: [page('a', { title: 'أ' }), page('b', { title: 'ب' })] })

    expect(result.text).toContain('1. أ')
    expect(result.text).toContain('2. ب')
  })
})

describe('طريقة عرض الروابط — §9.8', () => {
  const target = page('p1', { title: 'العنوان', url: 'https://example.com/x' })

  it('لكل طريقة سلوك معرَّف', () => {
    expect(LINK_DISPLAYS).toHaveLength(3)
  })

  it('العنوان والرابط معًا', () => {
    const result = build({ pages: [target], linkDisplay: 'title-and-url' })
    expect(result.text).toContain('العنوان')
    expect(result.text).toContain('https://example.com/x')
  })

  it('العنوان وحده يحذف الرابط', () => {
    const result = build({ pages: [target], linkDisplay: 'title-only' })
    expect(result.text).toContain('العنوان')
    expect(result.text).not.toContain('https://example.com/x')
  })

  it('الرابط وحده يحذف العنوان', () => {
    const result = build({ pages: [target], linkDisplay: 'url-only' })
    expect(result.text).toContain('https://example.com/x')
    expect(result.text).not.toContain('العنوان')
  })
})

describe('مفردات المنتج تُترجم مع العناوين — §12', () => {
  it('حالة التقدم والدور يخرجان بقيم العناوين الممرَّرة لا برموزهما', () => {
    const result = build({
      pages: [page('p1', { progressStatus: 'in-progress', role: 'verify' })],
    })

    expect(result.text).toContain('PS1')
    expect(result.text).toContain('R-VERIFY')
    expect(result.text).not.toContain('in-progress')
    expect(result.text).not.toContain('verify')
  })

  it('البعدان مستقلان: إطفاء الدور لا يطفئ التقدم', () => {
    const includes = { ...presetForLevel('detailed').includes, roles: false }
    const result = buildContext(
      input({ pages: [page('p1', { progressStatus: 'complete', role: 'primary' })], includes }),
      LABELS,
    )

    expect(result.text).toContain('PS3')
    expect(result.text).not.toContain('R-PRIMARY')
  })

  it('الدور الغائب لا يُخترع له قيمة', () => {
    const result = build({ pages: [page('p1')] })
    expect(result.text).not.toContain('ROLE:')
  })
})

describe('العدّ — §9.8', () => {
  it('يعدّ الحروف والكلمات', () => {
    expect(countText('one two three')).toEqual({ characters: 13, words: 3 })
  })

  it('النص الفارغ صفر كلمات لا واحدة', () => {
    expect(countText('   ')).toEqual({ characters: 3, words: 0 })
  })

  it('يعدّ الصفحات والملاحظات المضمَّنة فعلًا', () => {
    const pages = [
      page('p1', { notes: [note('n1', 'أ'), note('n2', 'ب')] }),
      page('p2', { notes: [note('n3', 'ج')] }),
    ]

    const result = build({ pages })

    expect(result.counts.pages).toBe(2)
    expect(result.counts.notes).toBe(3)
  })

  it('عدّ الملاحظات يتبع نطاق التضمين لا مجموع ما في المساحة', () => {
    const pages = [
      page('p1', { role: 'primary', notes: [note('n1', 'أ')] }),
      page('p2', { role: 'supporting', notes: [note('n2', 'ب')] }),
    ]

    const result = build({ pages, notesScope: 'important' })

    expect(result.counts.notes).toBe(1)
  })

  it('الحروف والكلمات تصف النص الناتج نفسه', () => {
    const result = build({ workspace: workspace({ goal: 'هدف' }) })
    expect(result.counts.characters).toBe(result.text.length)
  })
})

describe('التقسيم إلى أجزاء — §9.8', () => {
  it('نص قصير يبقى جزءًا واحدًا بلا ترويسة', () => {
    const parts = splitContext('سطر واحد', 'مساحتي', 'P{index}/{total}', 1000)

    expect(parts).toEqual(['سطر واحد'])
  })

  it('كل جزء يحمل اسم المساحة وترتيبه', () => {
    const text = ['أ'.repeat(40), 'ب'.repeat(40), 'ج'.repeat(40)].join('\n')
    const parts = splitContext(text, 'مساحتي', 'P{index}/{total}', 50)

    expect(parts.length).toBeGreaterThan(1)
    parts.forEach((part, index) => {
      expect(part).toContain('مساحتي')
      expect(part).toContain(`P${String(index + 1)}/${String(parts.length)}`)
    })
  })

  it('التقسيم لا يفقد أي سطر من المحتوى', () => {
    const lines = Array.from({ length: 30 }, (_, index) => `سطر رقم ${String(index)}`)
    const parts = splitContext(lines.join('\n'), 'مساحتي', 'P{index}/{total}', 60)

    for (const line of lines) {
      expect(parts.some((part) => part.includes(line))).toBe(true)
    }
  })

  it('لا يبتر سطرًا في منتصفه — يقسّم على حدود الأسطر', () => {
    const url = 'https://example.com/a-very-long-path-that-must-not-be-cut-in-half'
    const text = ['مقدمة قصيرة', url, 'خاتمة قصيرة'].join('\n')
    const parts = splitContext(text, 'مساحتي', 'P{index}/{total}', 30)

    expect(parts.some((part) => part.includes(url))).toBe(true)
  })

  it('عتبة الحجم اقتراح لا حد لتطبيق خارجي', () => {
    expect(isLargeContext({ pages: 0, notes: 0, characters: LARGE_CONTEXT_CHARACTERS, words: 0 })).toBe(
      false,
    )
    expect(
      isLargeContext({ pages: 0, notes: 0, characters: LARGE_CONTEXT_CHARACTERS + 1, words: 0 }),
    ).toBe(true)
  })
})

describe('مفردات القوالب', () => {
  it('القوالب الخمسة المنصوص عليها في §9.7', () => {
    expect([...CONTEXT_TEMPLATES]).toEqual([
      'research',
      'debug',
      'summarize',
      'compare',
      'continue',
    ])
  })

  it('المطلوب يُدرج حرفيًا كما حرّره المستخدم', () => {
    const edited = 'طلبي بعد التعديل الكامل'
    const result = build({ request: edited })

    expect(result.text).toContain(edited)
  })
})

describe('السياق الفارغ صريح لا موهِم', () => {
  it('إطفاء كل الأنواع يعطي نصًا فارغًا لا ترويسة وحيدة', () => {
    const detailed = presetForLevel('detailed').includes
    const includes = { ...detailed }
    for (const key of Object.keys(includes) as (keyof typeof includes)[]) {
      includes[key] = false
    }

    const result = buildContext(input({ includes, pages: [page('p1')] }), LABELS)

    expect(result.text).toBe('')
    expect(result.counts.characters).toBe(0)
  })

  it('مفتاح مفعّل بلا قيمة محفوظة لا يصنع محتوى', () => {
    const includes = { ...presetForLevel('detailed').includes }
    // مساحة بلا هدف ولا وصف ولا نقطة توقف ولا صفحات ولا مطلوب
    const result = buildContext(
      input({ workspace: workspace(), includes, pages: [], request: '' }),
      LABELS,
    )

    expect(result.text).toBe('')
  })

  it('أي قسم واحد بمحتوى يعيد ترويسة الهوية معه', () => {
    const result = build({ workspace: workspace({ goal: 'هدف' }) })

    expect(result.text).toContain('WS: مقارنة أطر الخصوصية')
    expect(result.text).toContain('هدف')
  })
})

describe('صيغة المخرج — §9.9', () => {
  const ws = workspace({ goal: 'الهدف' })
  const pages = [page('p1', { title: 'العنوان', url: 'https://example.com/x' })]

  it('الافتراضي نص عادي بلا علامات Markdown', () => {
    const result = buildContext(input({ workspace: ws, pages }), LABELS)

    expect(result.text).not.toContain('# ')
    expect(result.text).not.toContain('## ')
    expect(result.text).toContain('GOAL:')
  })

  it('Markdown يستخدم عناوين ورابطًا مدمجًا', () => {
    const result = buildContext(
      input({ workspace: ws, pages, format: 'markdown' }),
      LABELS,
    )

    expect(result.text).toContain('# WS: مقارنة أطر الخصوصية')
    expect(result.text).toContain('## GOAL')
    expect(result.text).toContain('[العنوان](https://example.com/x)')
  })

  it('الصيغتان تحملان المحتوى نفسه — الفرق شكلي لا انتقائي', () => {
    const rich = {
      workspace: workspace({ goal: 'الهدف', lastReached: 'نقطة التوقف' }),
      pages: [
        page('p1', {
          title: 'العنوان',
          reason: 'سبب الفتح',
          role: 'primary',
          notes: [note('n1', 'ملاحظتي')],
        }),
      ],
    }

    const plain = buildContext(input({ ...rich }), LABELS).text
    const markdown = buildContext(input({ ...rich, format: 'markdown' }), LABELS).text

    for (const value of ['الهدف', 'نقطة التوقف', 'العنوان', 'سبب الفتح', 'ملاحظتي']) {
      expect(plain).toContain(value)
      expect(markdown).toContain(value)
    }
  })

  it('عرض «العنوان وحده» لا يسرّب الرابط في Markdown', () => {
    const result = buildContext(
      input({ workspace: ws, pages, format: 'markdown', linkDisplay: 'title-only' }),
      LABELS,
    )

    expect(result.text).not.toContain('https://example.com/x')
    expect(result.text).toContain('العنوان')
  })

  it('محتوى المستخدم لا يُهرَّب ولا يُعدَّل في Markdown', () => {
    const result = buildContext(
      input({
        workspace: workspace({ goal: 'نص فيه [قوسان] و*نجمة*' }),
        format: 'markdown',
      }),
      LABELS,
    )

    expect(result.text).toContain('نص فيه [قوسان] و*نجمة*')
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'

import { readActiveTab, readCurrentWindowTabs } from '../../src/browser/tabs'

/**
 * مكاسة محدودة لواجهة chrome.tabs — كافية لهذه الاختبارات فقط، ولا تحاكي
 * سلوك Chrome كاملًا. طبقة browser وحدها من يُسمح لها بلمس chrome.* فعليًا؛
 * هنا نحاكيه لأننا نختبر تلك الطبقة نفسها.
 */
function stubChromeTabs(query: (options: unknown) => Promise<unknown[]>): void {
  ;(globalThis as { chrome?: unknown }).chrome = {
    tabs: { query },
  }
}

const originalChrome = (globalThis as { chrome?: unknown }).chrome

afterEach(() => {
  ;(globalThis as { chrome?: unknown }).chrome = originalChrome
})

function makeRawTab(overrides: Partial<chrome.tabs.Tab> = {}): chrome.tabs.Tab {
  return {
    id: 1,
    index: 0,
    windowId: 10,
    active: true,
    title: 'عنوان الصفحة',
    url: 'https://example.com/docs',
    pinned: false,
    highlighted: false,
    incognito: false,
    selected: false,
    discarded: false,
    autoDiscardable: true,
    groupId: -1,
    ...overrides,
  } as chrome.tabs.Tab
}

describe('readActiveTab', () => {
  it('يعيد captured مع title وurl الأصليين عند وجود تبويب نشط صالح', async () => {
    stubChromeTabs(() => Promise.resolve([makeRawTab()]))

    const result = await readActiveTab()

    expect(result.kind).toBe('captured')
    if (result.kind !== 'captured') return
    expect(result.tab.title).toBe('عنوان الصفحة')
    expect(result.tab.url).toBe('https://example.com/docs')
    expect(result.linkKind).toBe('http')
  })

  it('يستدعي chrome.tabs.query بخيارات active وcurrentWindow فقط', async () => {
    const query = vi.fn(() => Promise.resolve([makeRawTab()]))
    stubChromeTabs(query)

    await readActiveTab()

    expect(query).toHaveBeenCalledWith({ active: true, currentWindow: true })
  })

  it('يعيد no-suitable-tab عند عدم وجود أي تبويب', async () => {
    stubChromeTabs(() => Promise.resolve([]))

    const result = await readActiveTab()
    expect(result.kind).toBe('no-suitable-tab')
  })

  it.each([
    ['غائب', undefined],
    ['فارغ', ''],
    ['مسافات فقط', '   '],
  ])('يعيد unavailable عند title %s (لا يخترع عنوانًا)', async (_label, title) => {
    stubChromeTabs(() => Promise.resolve([makeRawTab({ title })]))

    const result = await readActiveTab()
    expect(result.kind).toBe('unavailable')
    if (result.kind !== 'unavailable') return
    expect(result.reason).toBe('missing-title')
  })

  it.each([
    ['غائب', undefined],
    ['فارغ', ''],
    ['مسافات فقط', '   '],
  ])('يعيد unavailable عند url %s (لا يخترع رابطًا)', async (_label, url) => {
    stubChromeTabs(() => Promise.resolve([makeRawTab({ url })]))

    const result = await readActiveTab()
    expect(result.kind).toBe('unavailable')
    if (result.kind !== 'unavailable') return
    expect(result.reason).toBe('missing-url')
  })

  it('لا يستبدل title وurl بنسخة trimmed عند النجاح — القيمة الأصلية تبقى حرفيًا', async () => {
    stubChromeTabs(() =>
      Promise.resolve([makeRawTab({ title: '  عنوان بمسافات  ', url: '  https://example.com/x  ' })]),
    )

    const result = await readActiveTab()
    expect(result.kind).toBe('captured')
    if (result.kind !== 'captured') return
    expect(result.tab.title).toBe('  عنوان بمسافات  ')
    expect(result.tab.url).toBe('  https://example.com/x  ')
  })

  it('لا يرفض مخططًا غير HTTP قابلًا للحفظ لمجرد تعذّر الوصول إلى محتواه', async () => {
    stubChromeTabs(() =>
      Promise.resolve([makeRawTab({ url: 'file:///Users/x/report.pdf', title: 'تقرير' })]),
    )

    const result = await readActiveTab()
    expect(result.kind).toBe('captured')
    if (result.kind !== 'captured') return
    expect(result.linkKind).toBe('other-scheme')
  })

  it('يعيد api-error عند رفض chrome.tabs.query', async () => {
    stubChromeTabs(() => Promise.reject(new Error('extension context invalidated')))

    const result = await readActiveTab()
    expect(result.kind).toBe('api-error')
    if (result.kind !== 'api-error') return
    expect(result.message).toContain('extension context invalidated')
  })

  it('لا تحفظ شيئًا بنفسها ولا تلمس أي مخزن', async () => {
    stubChromeTabs(() => Promise.resolve([makeRawTab()]))
    // لا وسيط تخزين يُمرَّر لها إطلاقًا — الدالة لا تقبل db، فيستحيل بنيويًا أن تكتب.
    const result = await readActiveTab()
    expect(result.kind).toBe('captured')
  })

  it('يصنّف صفحة داخلية للمتصفح ضمن captured، لا كرفض منفصل', async () => {
    stubChromeTabs(() => Promise.resolve([makeRawTab({ url: 'chrome://settings', title: 'الإعدادات' })]))

    const result = await readActiveTab()
    expect(result.kind).toBe('captured')
    if (result.kind !== 'captured') return
    expect(result.linkKind).toBe('browser-internal')
  })
})

describe('readCurrentWindowTabs', () => {
  it('يعيد التبويبات مرتبة حسب index', async () => {
    stubChromeTabs(() =>
      Promise.resolve([
        makeRawTab({ id: 2, index: 2, title: 'ثالث', url: 'https://example.com/3' }),
        makeRawTab({ id: 1, index: 0, title: 'أول', url: 'https://example.com/1' }),
        makeRawTab({ id: 3, index: 1, title: 'ثانٍ', url: 'https://example.com/2' }),
      ]),
    )

    const result = await readCurrentWindowTabs()
    expect(result.kind).toBe('read')
    if (result.kind !== 'read') return
    expect(result.usable.map((t) => t.title)).toEqual(['أول', 'ثانٍ', 'ثالث'])
  })

  it('لا تسقط تبويبًا غير صالح صامتًا — يظهر في unavailable بترتيبه وسببه', async () => {
    stubChromeTabs(() =>
      Promise.resolve([
        makeRawTab({ id: 1, index: 0, title: 'صالح', url: 'https://example.com/1' }),
        makeRawTab({ id: 2, index: 1, title: undefined, url: undefined }),
      ]),
    )

    const result = await readCurrentWindowTabs()
    expect(result.kind).toBe('read')
    if (result.kind !== 'read') return
    expect(result.usable).toHaveLength(1)
    expect(result.unavailable).toEqual([{ index: 1, reason: 'missing-url' }])
  })

  it('تبويب بعنوان من مسافات فقط لا يمر كصالح — يظهر في unavailable بسبب العنوان', async () => {
    stubChromeTabs(() =>
      Promise.resolve([makeRawTab({ id: 1, index: 0, title: '   ', url: 'https://example.com/1' })]),
    )

    const result = await readCurrentWindowTabs()
    expect(result.kind).toBe('read')
    if (result.kind !== 'read') return
    expect(result.usable).toEqual([])
    expect(result.unavailable).toEqual([{ index: 0, reason: 'missing-title' }])
  })

  it('تبويب برابط فارغ لا يمر كصالح — يظهر في unavailable بسبب الرابط', async () => {
    stubChromeTabs(() =>
      Promise.resolve([makeRawTab({ id: 1, index: 0, title: 'عنوان', url: '' })]),
    )

    const result = await readCurrentWindowTabs()
    expect(result.kind).toBe('read')
    if (result.kind !== 'read') return
    expect(result.usable).toEqual([])
    expect(result.unavailable).toEqual([{ index: 0, reason: 'missing-url' }])
  })

  it('لا يكشف url أو title ضمن unavailable', async () => {
    stubChromeTabs(() => Promise.resolve([makeRawTab({ id: 2, index: 4, title: undefined, url: undefined })]))

    const result = await readCurrentWindowTabs()
    expect(result.kind).toBe('read')
    if (result.kind !== 'read') return
    expect(JSON.stringify(result.unavailable)).not.toContain('example.com')
    expect(Object.keys(result.unavailable[0] ?? {}).sort()).toEqual(['index', 'reason'])
  })

  it('يستدعي chrome.tabs.query بخيار currentWindow فقط دون تحديد active', async () => {
    const query = vi.fn(() => Promise.resolve([makeRawTab()]))
    stubChromeTabs(query)

    await readCurrentWindowTabs()

    expect(query).toHaveBeenCalledWith({ currentWindow: true })
  })

  it('يعيد api-error عند رفض chrome.tabs.query', async () => {
    stubChromeTabs(() => Promise.reject(new Error('boom')))

    const result = await readCurrentWindowTabs()
    expect(result.kind).toBe('api-error')
  })

  it('قائمة فارغة عند عدم وجود تبويبات', async () => {
    stubChromeTabs(() => Promise.resolve([]))

    const result = await readCurrentWindowTabs()
    expect(result).toEqual({ kind: 'read', usable: [], unavailable: [] })
  })
})

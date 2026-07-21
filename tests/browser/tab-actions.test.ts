import { afterEach, describe, expect, it, vi } from 'vitest'

import { closeTabs, openTab } from '../../src/browser/tabs'

/**
 * أغلفة فتح التبويبات وإغلاقها. المحاكاة هنا مشروعة: هذه هي الطبقة الوحيدة
 * المسموح لها بلمس `chrome.*`، فاختبارها يقتضي محاكاته.
 */

const originalChrome = (globalThis as { chrome?: unknown }).chrome

function stubTabs(overrides: {
  create?: (options: unknown) => Promise<unknown>
  remove?: (ids: unknown) => Promise<void>
}): void {
  ;(globalThis as { chrome?: unknown }).chrome = {
    tabs: {
      create: overrides.create ?? (() => Promise.resolve({ id: 1 })),
      remove: overrides.remove ?? (() => Promise.resolve()),
    },
  }
}

afterEach(() => {
  ;(globalThis as { chrome?: unknown }).chrome = originalChrome
})

describe('openTab', () => {
  it('يفتح الرابط ويعيد معرّف التبويب', async () => {
    const create = vi.fn(() => Promise.resolve({ id: 77 }))
    stubTabs({ create })

    const result = await openTab('https://example.com/x', { active: true })

    expect(result).toEqual({ kind: 'opened', tabId: 77 })
    expect(create).toHaveBeenCalledWith({ url: 'https://example.com/x', active: true })
  })

  it('ينجح ولو لم يُعِد المتصفح معرّفًا', async () => {
    stubTabs({ create: () => Promise.resolve({}) })

    expect(await openTab('https://example.com/x', { active: false })).toEqual({ kind: 'opened' })
  })

  it('رفض المتصفح يعود unavailable لا استثناءً منتشرًا', async () => {
    stubTabs({ create: () => Promise.reject(new Error('Cannot navigate to a chrome:// URL')) })

    const result = await openTab('chrome://settings', { active: false })

    expect(result.kind).toBe('unavailable')
    if (result.kind !== 'unavailable') return
    expect(result.message).toContain('chrome://')
  })

  it('لا يحجب مخططًا مسبقًا — يحاول ويبلّغ بما حدث', async () => {
    const create = vi.fn(() => Promise.resolve({ id: 5 }))
    stubTabs({ create })

    const result = await openTab('file:///Users/x/report.pdf', { active: false })

    expect(create).toHaveBeenCalled()
    expect(result.kind).toBe('opened')
  })

  it('يمرّر active كما طُلب لا دائمًا', async () => {
    const seen: boolean[] = []
    stubTabs({
      create: (options) => {
        seen.push((options as { active: boolean }).active)
        return Promise.resolve({ id: 1 })
      },
    })

    await openTab('https://example.com/a', { active: false })
    await openTab('https://example.com/b', { active: true })

    expect(seen).toEqual([false, true])
  })
})

describe('closeTabs', () => {
  it('يغلق المعرفات الممرَّرة ويعيد عددها', async () => {
    const remove = vi.fn(() => Promise.resolve())
    stubTabs({ remove })

    const result = await closeTabs([11, 22])

    expect(result).toEqual({ kind: 'closed', count: 2 })
    expect(remove).toHaveBeenCalledWith([11, 22])
  })

  it('قائمة فارغة لا تستدعي المتصفح إطلاقًا', async () => {
    const remove = vi.fn(() => Promise.resolve())
    stubTabs({ remove })

    const result = await closeTabs([])

    expect(result).toEqual({ kind: 'closed', count: 0 })
    expect(remove).not.toHaveBeenCalled()
  })

  it('فشل الإغلاق يعود api-error منظمًا', async () => {
    stubTabs({ remove: () => Promise.reject(new Error('no such tab')) })

    const result = await closeTabs([11])

    expect(result.kind).toBe('api-error')
    if (result.kind !== 'api-error') return
    expect(result.message).toContain('no such tab')
  })
})

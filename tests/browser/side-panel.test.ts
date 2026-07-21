import { afterEach, describe, expect, it, vi } from 'vitest'

import { enableOpenPanelOnActionClick } from '../../src/browser/side-panel'

/**
 * سلوك فتح اللوحة المعتمد بعد مرحلة التكامل التنفيذي: نقر الأيقونة يفتح
 * اللوحة مباشرة عبر `openPanelOnActionClick` — لا نافذة وسيطة (تعديل مؤرخ
 * على قرار 0003).
 */

const originalChrome = (globalThis as { chrome?: unknown }).chrome

afterEach(() => {
  ;(globalThis as { chrome?: unknown }).chrome = originalChrome
})

describe('enableOpenPanelOnActionClick', () => {
  it('يضبط سلوك المنصة: النقر على الأيقونة يفتح اللوحة الجانبية', async () => {
    const setPanelBehavior = vi.fn().mockResolvedValue(undefined)
    ;(globalThis as { chrome?: unknown }).chrome = {
      sidePanel: { setPanelBehavior },
    }

    await enableOpenPanelOnActionClick()

    expect(setPanelBehavior).toHaveBeenCalledWith({ openPanelOnActionClick: true })
  })

  it('يرفع خطأ الواجهة كما هو — لا ابتلاع صامتًا', async () => {
    ;(globalThis as { chrome?: unknown }).chrome = {
      sidePanel: {
        setPanelBehavior: () => Promise.reject(new Error('side panel unavailable')),
      },
    }

    await expect(enableOpenPanelOnActionClick()).rejects.toThrow('side panel unavailable')
  })
})

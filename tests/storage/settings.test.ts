import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_SETTINGS } from '../../src/core/settings'
import { patchSettings, readSettings, writeSettings } from '../../src/storage/settings'

/**
 * بديل في الذاكرة عن `chrome.storage.local`.
 *
 * `src/browser` هو الحد الوحيد الذي يلمس واجهة المتصفح، فيكفي استبداله هنا
 * لاختبار طبقة التخزين كاملة دون تشغيل إضافة.
 */
let store: Record<string, unknown> = {}

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: (key: string) => Promise.resolve({ [key]: store[key] }),
      set: (items: Record<string, unknown>) => {
        Object.assign(store, items)
        return Promise.resolve()
      },
    },
  },
})

beforeEach(() => {
  store = {}
})

describe('readSettings', () => {
  it('يعيد القيم الافتراضية عند التشغيل الأول', async () => {
    await expect(readSettings()).resolves.toEqual(DEFAULT_SETTINGS)
  })

  it('يعيد القيم المحفوظة', async () => {
    store['jusoor.settings'] = { language: 'ar', theme: 'dark' }
    await expect(readSettings()).resolves.toEqual({
      language: 'ar',
      theme: 'dark',
      firstRunSeen: false,
    })
  })

  it('يطبّع القيمة المحفوظة التالفة بدل تمريرها', async () => {
    store['jusoor.settings'] = { language: 'ar', theme: 'neon' }
    await expect(readSettings()).resolves.toEqual({
      language: 'ar',
      theme: 'system',
      firstRunSeen: false,
    })
  })
})

describe('writeSettings', () => {
  it('يحفظ الإعدادات ويعيدها مطبَّعة', async () => {
    const saved = await writeSettings({ language: 'en', theme: 'light', firstRunSeen: false })

    expect(saved).toEqual({ language: 'en', theme: 'light', firstRunSeen: false })
    expect(store['jusoor.settings']).toEqual({
      language: 'en',
      theme: 'light',
      firstRunSeen: false,
    })
  })

  it('لا يحفظ قيمة غير صالحة', async () => {
    await writeSettings({
      language: 'klingon',
      theme: 'dark',
    } as unknown as Parameters<typeof writeSettings>[0])

    expect(store['jusoor.settings']).toEqual({ language: 'auto', theme: 'dark', firstRunSeen: false })
  })
})

describe('patchSettings', () => {
  it('يحدّث اللغة ويبقي السمة', async () => {
    await writeSettings({ language: 'en', theme: 'dark', firstRunSeen: true })

    await expect(patchSettings({ language: 'ar' })).resolves.toEqual({
      language: 'ar',
      theme: 'dark',
      firstRunSeen: true,
    })
  })

  it('يحدّث السمة ويبقي اللغة', async () => {
    await writeSettings({ language: 'ar', theme: 'light', firstRunSeen: true })

    await expect(patchSettings({ theme: 'system' })).resolves.toEqual({
      language: 'ar',
      theme: 'system',
      firstRunSeen: true,
    })
  })
})

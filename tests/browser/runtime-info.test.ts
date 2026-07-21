import { afterEach, describe, expect, it, vi } from 'vitest'

import { readExtensionVersion, requestUpdateCheck } from '../../src/browser/runtime-info'

/**
 * قراءة الإصدار من manifest التشغيل.
 *
 * المهم هنا حالتا الغياب والعطل: الشاشة التي تعرض الإصدار يجب ألا تنهار خارج
 * سياق الإضافة (لا chrome، أو chrome بلا runtime.getManifest، أو استدعاء يرمي)،
 * بل تحصل على undefined فتُخفي السطر.
 */

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubChrome(value: unknown) {
  vi.stubGlobal('chrome', value)
}

describe('readExtensionVersion', () => {
  it('يعيد الإصدار من getManifest', () => {
    stubChrome({ runtime: { getManifest: () => ({ version: '1.0.0' }) } })

    expect(readExtensionVersion()).toBe('1.0.0')
  })

  it('يعيد undefined عند غياب chrome كليًا', () => {
    // بيئة node الاختبارية نفسها بلا أي stub — الغياب الحقيقي لا محاكاته
    expect(typeof chrome).toBe('undefined')
    expect(readExtensionVersion()).toBeUndefined()
  })

  it('يعيد undefined عند وجود chrome بلا runtime', () => {
    stubChrome({})

    expect(readExtensionVersion()).toBeUndefined()
  })

  it('يعيد undefined عند وجود runtime بلا getManifest', () => {
    stubChrome({ runtime: {} })

    expect(readExtensionVersion()).toBeUndefined()
  })

  it('لا يرمي حين يرمي getManifest نفسه', () => {
    stubChrome({
      runtime: {
        getManifest: () => {
          throw new Error('عطل داخلي')
        },
      },
    })

    expect(readExtensionVersion()).toBeUndefined()
  })
})

describe('requestUpdateCheck', () => {
  it('يعيد no_update كما وردت من المتصفح', async () => {
    stubChrome({ runtime: { requestUpdateCheck: () => Promise.resolve({ status: 'no_update' }) } })

    await expect(requestUpdateCheck()).resolves.toEqual({ status: 'no_update' })
  })

  it('يعيد update_available مع رقم الإصدار', async () => {
    stubChrome({
      runtime: {
        requestUpdateCheck: () =>
          Promise.resolve({ status: 'update_available', version: '1.1.0' }),
      },
    })

    await expect(requestUpdateCheck()).resolves.toEqual({
      status: 'update_available',
      version: '1.1.0',
    })
  })

  it('يميّز throttled عن no_update — لا يُدمَجان', async () => {
    stubChrome({ runtime: { requestUpdateCheck: () => Promise.resolve({ status: 'throttled' }) } })

    await expect(requestUpdateCheck()).resolves.toEqual({ status: 'throttled' })
  })

  it('يعيد unavailable عند غياب chrome كليًا', async () => {
    expect(typeof chrome).toBe('undefined')
    await expect(requestUpdateCheck()).resolves.toEqual({ status: 'unavailable' })
  })

  it('يعيد unavailable عند وجود runtime بلا requestUpdateCheck', async () => {
    stubChrome({ runtime: {} })

    await expect(requestUpdateCheck()).resolves.toEqual({ status: 'unavailable' })
  })

  it('لا يرمي حين يرفض الاستدعاء نفسه', async () => {
    stubChrome({
      runtime: { requestUpdateCheck: () => Promise.reject(new Error('عطل داخلي')) },
    })

    await expect(requestUpdateCheck()).resolves.toEqual({ status: 'unavailable' })
  })
})

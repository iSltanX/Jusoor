import { afterEach, describe, expect, it, vi } from 'vitest'

import { hasTabsPermission, requestTabsPermission } from '../../src/browser/permissions'

const originalChrome = (globalThis as { chrome?: unknown }).chrome

function stubChromePermissions(overrides: {
  contains?: (options: unknown) => Promise<boolean>
  request?: (options: unknown) => Promise<boolean>
}): void {
  ;(globalThis as { chrome?: unknown }).chrome = {
    permissions: {
      contains: overrides.contains ?? (() => Promise.resolve(false)),
      request: overrides.request ?? (() => Promise.resolve(false)),
    },
  }
}

afterEach(() => {
  ;(globalThis as { chrome?: unknown }).chrome = originalChrome
})

describe('hasTabsPermission', () => {
  it('يعيد true حين تكون الصلاحية ممنوحة', async () => {
    stubChromePermissions({ contains: () => Promise.resolve(true) })
    expect(await hasTabsPermission()).toBe(true)
  })

  it('يعيد false حين لا تكون الصلاحية ممنوحة', async () => {
    stubChromePermissions({ contains: () => Promise.resolve(false) })
    expect(await hasTabsPermission()).toBe(false)
  })

  it('يفحص صلاحية tabs تحديدًا دون طلبها', async () => {
    const contains = vi.fn(() => Promise.resolve(true))
    const request = vi.fn(() => Promise.resolve(true))
    stubChromePermissions({ contains, request })

    await hasTabsPermission()

    expect(contains).toHaveBeenCalledWith({ permissions: ['tabs'] })
    expect(request).not.toHaveBeenCalled()
  })
})

describe('requestTabsPermission', () => {
  it('يعيد granted: true عند قبول المستخدم', async () => {
    stubChromePermissions({ request: () => Promise.resolve(true) })
    const result = await requestTabsPermission()
    expect(result).toEqual({ granted: true })
  })

  it('يعيد granted: false مع reason denied عند الرفض', async () => {
    stubChromePermissions({ request: () => Promise.resolve(false) })
    const result = await requestTabsPermission()
    expect(result).toEqual({ granted: false, reason: 'denied' })
  })

  it('يعيد granted: false مع reason api-error عند رفض الوعد', async () => {
    stubChromePermissions({ request: () => Promise.reject(new Error('not in a user gesture')) })
    const result = await requestTabsPermission()
    expect(result.granted).toBe(false)
    if (result.granted) return
    expect(result.reason).toBe('api-error')
    expect(result.message).toContain('not in a user gesture')
  })

  it('يطلب صلاحية tabs تحديدًا لا صلاحية أخرى', async () => {
    const request = vi.fn(() => Promise.resolve(true))
    stubChromePermissions({ request })

    await requestTabsPermission()

    expect(request).toHaveBeenCalledWith({ permissions: ['tabs'] })
  })
})

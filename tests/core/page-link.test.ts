import { describe, expect, it } from 'vitest'

import { classifyPageUrl } from '../../src/core/page-link'

describe('classifyPageUrl', () => {
  it('يصنّف رابط http عاديًا', () => {
    expect(classifyPageUrl('http://example.com/docs')).toBe('http')
  })

  it('يصنّف رابط https عاديًا', () => {
    expect(classifyPageUrl('https://example.com/docs')).toBe('http')
  })

  it('يصنّف صفحات المتصفح الداخلية (chrome:)', () => {
    expect(classifyPageUrl('chrome://settings')).toBe('browser-internal')
  })

  it('يصنّف صفحات Edge الداخلية (edge:)', () => {
    expect(classifyPageUrl('edge://settings')).toBe('browser-internal')
  })

  it('يصنّف about: كصفحة داخلية', () => {
    expect(classifyPageUrl('about:blank')).toBe('browser-internal')
  })

  it('يصنّف devtools: كصفحة داخلية', () => {
    expect(classifyPageUrl('devtools://devtools/bundled/inspector.html')).toBe('browser-internal')
  })

  it('يصنّف صفحة الإضافة نفسها (chrome-extension:)', () => {
    expect(classifyPageUrl('chrome-extension://abcdefg/sidepanel.html')).toBe('extension-page')
  })

  it('يصنّف مخططًا آخر (file:) كمخطط آخر', () => {
    expect(classifyPageUrl('file:///Users/x/report.pdf')).toBe('other-scheme')
  })

  it('يصنّف مخططًا آخر (ftp:) كمخطط آخر', () => {
    expect(classifyPageUrl('ftp://files.example.com/report.zip')).toBe('other-scheme')
  })

  it('يصنّف data: كمخطط آخر', () => {
    expect(classifyPageUrl('data:text/plain,hello')).toBe('other-scheme')
  })

  it('لا يرمي استثناءً على نص بلا مخطط إطلاقًا', () => {
    expect(() => classifyPageUrl('not-a-url-at-all')).not.toThrow()
    expect(classifyPageUrl('not-a-url-at-all')).toBe('other-scheme')
  })

  it('مطابقة المخطط غير حساسة لحالة الأحرف', () => {
    expect(classifyPageUrl('CHROME://settings')).toBe('browser-internal')
    expect(classifyPageUrl('HTTPS://example.com')).toBe('http')
  })
})

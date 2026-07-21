import { describe, expect, it } from 'vitest'

import {
  directionForLanguage,
  resolveLanguage,
  resolveTheme,
} from '../../src/core/preferences'

/**
 * هذه الاختبارات تعمل في بيئة node بلا متصفح ولا DOM.
 * نجاحها هو الدليل العملي على أن منطق core مستقل عن واجهات المتصفح.
 */

describe('resolveLanguage', () => {
  it('يطبّق الاختيار الصريح ويتجاهل لغة المتصفح', () => {
    expect(resolveLanguage('ar', ['en-US'])).toBe('ar')
    expect(resolveLanguage('en', ['ar-SA'])).toBe('en')
  })

  it('يتبع أول لغة متصفح مدعومة عند auto', () => {
    expect(resolveLanguage('auto', ['ar-SA', 'en-US'])).toBe('ar')
    expect(resolveLanguage('auto', ['en-GB', 'ar'])).toBe('en')
  })

  it('يتجاوز اللغات غير المدعومة إلى أول لغة مدعومة', () => {
    expect(resolveLanguage('auto', ['fr-FR', 'de', 'ar'])).toBe('ar')
  })

  it('يسقط إلى الإنجليزية عند غياب أي لغة مدعومة — دستور المنتج §12', () => {
    expect(resolveLanguage('auto', ['fr-FR', 'de-DE'])).toBe('en')
    expect(resolveLanguage('auto', [])).toBe('en')
    expect(resolveLanguage('auto')).toBe('en')
  })

  it('لا يتأثر بحالة الأحرف ولا بالمسافات في وسم اللغة', () => {
    expect(resolveLanguage('auto', [' AR-sa '])).toBe('ar')
  })
})

describe('directionForLanguage', () => {
  it('العربية RTL والإنجليزية LTR', () => {
    expect(directionForLanguage('ar')).toBe('rtl')
    expect(directionForLanguage('en')).toBe('ltr')
  })
})

describe('resolveTheme', () => {
  it('يطبّق الاختيار الصريح مهما كان إعداد النظام', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('يتبع إعداد النظام عند system', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })
})

import { describe, expect, it } from 'vitest'

import { DEFAULT_SETTINGS, normalizeSettings } from '../../src/core/settings'

describe('normalizeSettings', () => {
  it('الافتراضي هو اتباع المتصفح واتباع النظام', () => {
    expect(DEFAULT_SETTINGS).toEqual({ language: 'auto', theme: 'system', firstRunSeen: false })
  })

  it('يقبل القيم الصالحة كما هي', () => {
    expect(normalizeSettings({ language: 'ar', theme: 'dark' })).toEqual({
      language: 'ar',
      theme: 'dark',
      firstRunSeen: false,
    })
  })

  it('يعيد الافتراضي عند غياب القيمة أو كونها من نوع غير متوقع', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(normalizeSettings('ar')).toEqual(DEFAULT_SETTINGS)
    expect(normalizeSettings({})).toEqual(DEFAULT_SETTINGS)
  })

  it('يعزل الإعداد التالف فلا يُفقد الإعداد السليم بجانبه', () => {
    expect(normalizeSettings({ language: 'ar', theme: 'neon' })).toEqual({
      language: 'ar',
      theme: 'system',
      firstRunSeen: false,
    })
    expect(normalizeSettings({ language: 42, theme: 'dark' })).toEqual({
      language: 'auto',
      theme: 'dark',
      firstRunSeen: false,
    })
  })

  it('يتجاهل المفاتيح غير المعروفة', () => {
    expect(normalizeSettings({ language: 'en', theme: 'light', extra: true })).toEqual({
      language: 'en',
      theme: 'light',
      firstRunSeen: false,
    })
  })

  it('علامة أول تشغيل تُقرأ true فقط من قيمة منطقية صريحة', () => {
    expect(normalizeSettings({ firstRunSeen: true }).firstRunSeen).toBe(true)
    // أي قيمة أخرى تُقرأ «لم يرَ بعد»: إعادة العرض أهون من إخفاء التعريف خطأً
    expect(normalizeSettings({ firstRunSeen: 'yes' }).firstRunSeen).toBe(false)
    expect(normalizeSettings({ firstRunSeen: 1 }).firstRunSeen).toBe(false)
    expect(normalizeSettings({}).firstRunSeen).toBe(false)
  })
})

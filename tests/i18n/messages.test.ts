import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { createTranslator, type MessageKey } from '../../src/i18n/messages'

/**
 * `en` مُعرَّف بـ `Record<MessageKey, string>` فيمنع المترجم غياب أي مفتاح وقت
 * الترجمة. هذه الاختبارات تغطي ما لا يمنعه النوع: نص فارغ، أو نسخة إنجليزية
 * تُركت مطابقة للعربية سهوًا، أو مَعلَم `{name}` بلا قيمة تُدرج مكانه.
 */

const source = readFileSync('src/i18n/messages.ts', 'utf8')

/**
 * يستخرج المفاتيح مرة واحدة لكل مفتاح.
 *
 * النمط يطابق القاموسين معًا (العربي والإنجليزي)، فكل مفتاح يظهر مرتين. بلا
 * `Set` كان كل اختبار يُنفَّذ مرتين على المفتاح نفسه — عدد أكبر بلا تغطية أكبر.
 *
 * الشرطة داخل صنف المحارف مقصودة: كان النمط `[\w.]+` يُسقط كل مفتاح يحمل شرطة
 * (`progress.not-started` و`progress.in-progress` و`tabStatus.not-attempted`)
 * من الفحص كله صامتًا — لا يفشل، بل لا يُفحص أصلًا. والاختبار أدناه يثبت أن
 * الاستخراج يغطي **كل** مفتاح معرَّف فعلًا، فلا تتكرر الفجوة بصيغة أخرى.
 */
const KEYS = [
  ...new Set([...source.matchAll(/^ {2}'([\w.-]+)':/gm)].map((match) => match[1])),
] as MessageKey[]

/** كل مفتاح معرَّف في المصدر، بأي محارف كانت — أساس فحص اكتمال الاستخراج. */
const DEFINED_KEYS = new Set(
  [...source.matchAll(/^ {2}'([^']+)':/gm)]
    .map((match) => match[1])
    .filter((key): key is string => key !== undefined),
)

const ar = createTranslator('ar')
const en = createTranslator('en')

describe('اكتمال القاموسين', () => {
  it('يستخرج مفاتيح فعلية للفحص', () => {
    expect(KEYS.length).toBeGreaterThan(40)
  })

  it('الاستخراج يغطي كل مفتاح معرَّف — لا مفتاح يفلت من الفحص صامتًا', () => {
    const extracted = new Set<string>(KEYS)
    const missed = [...DEFINED_KEYS].filter((key) => !extracted.has(key))

    expect(missed, `مفاتيح معرَّفة ولا تُفحص: ${missed.join('، ')}`).toEqual([])
  })

  it.each(KEYS)('%s له نص عربي غير فارغ', (key) => {
    expect(ar(key).trim()).not.toBe('')
  })

  it.each(KEYS)('%s له نص إنجليزي غير فارغ', (key) => {
    expect(en(key).trim()).not.toBe('')
  })

  it('لا مفتاح ينقصه أحد اللغتين', () => {
    const missing = KEYS.filter((key) => ar(key) === undefined || en(key) === undefined)
    expect(missing).toEqual([])
  })

  it('لا نص إنجليزي تُرك نسخة من العربية سهوًا', () => {
    /*
     * متطابقة عمدًا لا سهوًا:
     * - أسماء اللغات تُعرض بلغتها دائمًا («العربية» و«English»).
     * - أسماء صيغ الملفات أعلام لا تُترجم؛ «JSON» بالعربية JSON، وترجمتها
     *   تُنتج اسم صيغة لا وجود له.
     */
    const intentionallyIdentical = new Set<string>([
      'settings.language.ar',
      'settings.language.en',
      'transfer.format.json',
      'transfer.format.markdown',
      // «PDF» علم صيغة ملف لا يُترجم — شارة نوع الوثيقة في بطاقة الصفحة
      'page.pdf',
    ])

    const suspicious = KEYS.filter(
      (key) => !intentionallyIdentical.has(key) && ar(key) === en(key),
    )

    expect(suspicious).toEqual([])
  })
})

describe('إدراج القيم', () => {
  it('يدرج العدد في اللغتين', () => {
    expect(ar('success.pages', { count: 3 })).toContain('3')
    expect(en('success.pages', { count: 3 })).toContain('3')
  })

  it('يدرج أكثر من قيمة في النص نفسه', () => {
    expect(ar('tabs.selectedCount', { count: 2, total: 5 })).toBe('المختار: 2 من 5')
    expect(en('tabs.selectedCount', { count: 2, total: 5 })).toBe('Selected: 2 of 5')
  })

  it('لا يبقى مَعلَم غير مُستبدَل في أي نص يحمل مَعلَمًا', () => {
    /*
     * أسماء المَعالم تُستخرج من النص نفسه لا تُكتب هنا يدويًا: كانت مثبَّتة على
     * `count` و`total` وحدهما، فصار كل مَعلَم جديد يُدخله المنتج يُفشل الاختبار
     * لسبب لا علاقة له بخطأ حقيقي. الاستخراج يجعل الفحص يتبع القاموس تلقائيًا.
     */
    const namesIn = (template: string): string[] =>
      [...template.matchAll(/\{(\w+)}/g)].map((match) => match[1] ?? '')

    const withPlaceholders = KEYS.filter(
      (key) => namesIn(ar(key)).length > 0 || namesIn(en(key)).length > 0,
    )
    expect(withPlaceholders.length).toBeGreaterThan(0)

    for (const key of withPlaceholders) {
      for (const translate of [ar, en]) {
        const params = Object.fromEntries(namesIn(translate(key)).map((name) => [name, 1]))
        expect(translate(key, params), `${key} أبقى مَعلَمًا غير مُستبدَل`).not.toMatch(/\{\w+}/)
      }
    }
  })

  it('المَعلَمان نفساهما موجودان في اللغتين — لا نسخة تفقد قيمة تُدرَج', () => {
    const namesIn = (template: string): string[] =>
      [...template.matchAll(/\{(\w+)}/g)].map((match) => match[1] ?? '').sort()

    for (const key of KEYS) {
      expect(namesIn(en(key)), `${key} يختلف مَعالمه بين اللغتين`).toEqual(namesIn(ar(key)))
    }
  })

  it('يترك المَعلَم كما هو إن لم تُمرَّر قيمته — لا يُحذف النص صامتًا', () => {
    expect(ar('success.pages', {})).toContain('{count}')
  })
})

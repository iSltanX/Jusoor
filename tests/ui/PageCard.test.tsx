import { describe, expect, it } from 'vitest'

import { faviconTone, isPdfUrl, latestNote } from '../../src/ui/workspace/PageCard'
import { asPageNoteId } from '../../src/core/ids'
import type { PageNote } from '../../src/core/page'

/**
 * قواعد بطاقة الصفحة الخالصة: نغمة هوية الموقع بقواعد ثابتة لا عشوائية،
 * و«آخر ملاحظة» بأحدث وقت تعديل فعلي لا موقعها في القائمة.
 */

function note(id: string, updatedAt: number): PageNote {
  return { id: asPageNoteId(id), body: `ملاحظة ${id}`, createdAt: 1, updatedAt }
}

describe('faviconTone — قواعد ثابتة بالأولوية', () => {
  it('PDF → paper مهما كان المضيف', () => {
    expect(faviconTone({ url: 'https://sdaia.gov.sa/report.pdf' })).toBe('paper')
    expect(faviconTone({ url: 'https://github.com/x/file.PDF' })).toBe('paper')
  })

  it('دور «تحتاج تحققًا» → question — حكم المستخدم لا التخمين', () => {
    expect(faviconTone({ url: 'https://example.com/a', role: 'verify' })).toBe('question')
  })

  it('مضيف تطويري معروف → code، ويشمل النطاقات الفرعية', () => {
    expect(faviconTone({ url: 'https://github.com/iSltanX' })).toBe('code')
    expect(faviconTone({ url: 'https://gist.github.com/x' })).toBe('code')
    expect(faviconTone({ url: 'https://stackoverflow.com/q/1' })).toBe('code')
  })

  it('العام → brand، ولا يتلوّن غير المطابق للقواعد', () => {
    expect(faviconTone({ url: 'https://iapp.org/frameworks' })).toBe('brand')
    expect(faviconTone({ url: 'https://mygithub.company.io/x' })).toBe('brand')
  })
})

describe('isPdfUrl', () => {
  it('يقرأ المسار لا مجرد ورود pdf في الرابط', () => {
    expect(isPdfUrl('https://a.b/doc.pdf')).toBe(true)
    expect(isPdfUrl('https://a.b/pdf-guide')).toBe(false)
    expect(isPdfUrl('https://a.b/doc.pdf?x=1')).toBe(true)
  })
})

describe('latestNote — الأحدث تعديلًا فعليًا', () => {
  it('لا يختار الأولى ولا الأخيرة موقعيًا بل الأحدث وقتًا', () => {
    const notes = [note('n1', 500), note('n2', 900), note('n3', 200)]
    expect(latestNote(notes)?.id).toBe(asPageNoteId('n2'))
  })

  it('يتغيّر بعد حذف الأحدث', () => {
    const notes = [note('n1', 500), note('n3', 200)]
    expect(latestNote(notes)?.id).toBe(asPageNoteId('n1'))
  })

  it('بلا ملاحظات يعود undefined لا نصًا ثابتًا', () => {
    expect(latestNote([])).toBeUndefined()
  })
})

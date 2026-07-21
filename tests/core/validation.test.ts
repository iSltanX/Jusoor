import { describe, expect, it } from 'vitest'

import { asSavedPageId, asWorkspaceId } from '../../src/core/ids'
import {
  isActivePageWithinWorkspace,
  isDateOrderValid,
  isValidNoteBody,
  isValidOrder,
  isValidPageUrl,
  isValidTimestamp,
  isValidWorkspaceName,
  isWorkspaceStatusConsistent,
  normalizeLabels,
  normalizeOptionalText,
} from '../../src/core/validation'

describe('isValidWorkspaceName', () => {
  it('يرفض الاسم الفارغ وما يتكون من فراغ فقط', () => {
    expect(isValidWorkspaceName('')).toBe(false)
    expect(isValidWorkspaceName('   ')).toBe(false)
    expect(isValidWorkspaceName('\t\n')).toBe(false)
  })

  it('يقبل اسمًا فعليًا حتى مع فراغ طرفي', () => {
    expect(isValidWorkspaceName('  تحليل أطر الخصوصية  ')).toBe(true)
  })

  it('لا يفرض حدًا أقصى للطول — لا حدود تحريرية عشوائية', () => {
    expect(isValidWorkspaceName('س'.repeat(5000))).toBe(true)
  })
})

describe('normalizeOptionalText', () => {
  it('يزيل الفراغ الطرفي', () => {
    expect(normalizeOptionalText('  مرحبًا  ')).toBe('مرحبًا')
  })

  it('يحوّل الفراغ الكامل إلى غياب', () => {
    expect(normalizeOptionalText('   ')).toBeUndefined()
    expect(normalizeOptionalText('')).toBeUndefined()
  })

  it('الغياب يبقى غيابًا', () => {
    expect(normalizeOptionalText(undefined)).toBeUndefined()
  })

  it('لا يقصّ نصًا طويلًا — القص شأن عرض لا تخزين', () => {
    const long = 'أ'.repeat(10_000)
    expect(normalizeOptionalText(long)).toBe(long)
  })
})

describe('isValidPageUrl', () => {
  it('يقبل روابط http وhttps', () => {
    expect(isValidPageUrl('https://example.com/docs')).toBe(true)
    expect(isValidPageUrl('http://example.com')).toBe(true)
  })

  it('يقبل مخططات المتصفح الداخلية وPDF ونحوها — بلا قائمة سماح لمخطط بعينه', () => {
    expect(isValidPageUrl('chrome://extensions')).toBe(true)
    expect(isValidPageUrl('file:///Users/x/report.pdf')).toBe(true)
  })

  it('يرفض نصًا غير قابل للتحليل كرابط', () => {
    expect(isValidPageUrl('ليس رابطًا')).toBe(false)
    expect(isValidPageUrl('')).toBe(false)
  })
})

describe('isValidOrder', () => {
  it('يقبل صفرًا وأعدادًا موجبة', () => {
    expect(isValidOrder(0)).toBe(true)
    expect(isValidOrder(1024)).toBe(true)
    expect(isValidOrder(0.5)).toBe(true)
  })

  it('يرفض السالب واللانهاية وNaN', () => {
    expect(isValidOrder(-1)).toBe(false)
    expect(isValidOrder(Number.POSITIVE_INFINITY)).toBe(false)
    expect(isValidOrder(Number.NaN)).toBe(false)
  })
})

describe('isValidTimestamp', () => {
  it('يقبل عددًا صحيحًا موجبًا', () => {
    expect(isValidTimestamp(1)).toBe(true)
    expect(isValidTimestamp(Date.now())).toBe(true)
  })

  it('يرفض الصفر والسالب وغير الصحيح واللانهاية', () => {
    expect(isValidTimestamp(0)).toBe(false)
    expect(isValidTimestamp(-100)).toBe(false)
    expect(isValidTimestamp(1.5)).toBe(false)
    expect(isValidTimestamp(Number.POSITIVE_INFINITY)).toBe(false)
  })
})

describe('isValidNoteBody', () => {
  it('يرفض نص ملاحظة فارغًا أو فراغًا فقط', () => {
    expect(isValidNoteBody('')).toBe(false)
    expect(isValidNoteBody('   ')).toBe(false)
  })

  it('يقبل نصًا فعليًا', () => {
    expect(isValidNoteBody('التعريف أوسع من CCPA')).toBe(true)
  })
})

describe('normalizeLabels', () => {
  it('يزيل الفراغ الطرفي والعناصر الفارغة', () => {
    expect(normalizeLabels(['  مهمة  ', '', '   '])).toEqual(['مهمة'])
  })

  it('يمنع التكرار مع الحفاظ على أول ظهور', () => {
    expect(normalizeLabels(['مهمة', 'أعود لاحقًا', 'مهمة'])).toEqual([
      'مهمة',
      'أعود لاحقًا',
    ])
  })

  it('التكرار بعد التنظيف يُكتشف أيضًا (فراغ طرفي مختلف)', () => {
    expect(normalizeLabels(['مهمة', '  مهمة  '])).toEqual(['مهمة'])
  })

  it('قائمة فارغة تبقى فارغة', () => {
    expect(normalizeLabels([])).toEqual([])
  })
})

describe('isDateOrderValid', () => {
  it('يقبل createdAt أصغر من أو يساوي updatedAt', () => {
    expect(isDateOrderValid(100, 200)).toBe(true)
    expect(isDateOrderValid(100, 100)).toBe(true)
  })

  it('يرفض createdAt أكبر من updatedAt', () => {
    expect(isDateOrderValid(200, 100)).toBe(false)
  })
})

describe('isWorkspaceStatusConsistent', () => {
  it('active صالحة بلا frozenAt ولا archivedAt', () => {
    expect(isWorkspaceStatusConsistent({ status: 'active' })).toBe(true)
  })

  it('frozen صالحة إن وُجد frozenAt بلا archivedAt', () => {
    expect(isWorkspaceStatusConsistent({ status: 'frozen', frozenAt: 1 })).toBe(true)
  })

  it('archived صالحة إن وُجد archivedAt بلا frozenAt', () => {
    expect(isWorkspaceStatusConsistent({ status: 'archived', archivedAt: 1 })).toBe(true)
  })

  it('frozen بلا frozenAt غير صالحة', () => {
    expect(isWorkspaceStatusConsistent({ status: 'frozen' })).toBe(false)
  })

  it('archived بلا archivedAt غير صالحة', () => {
    expect(isWorkspaceStatusConsistent({ status: 'archived' })).toBe(false)
  })

  it('active مع frozenAt متبقٍ من حالة سابقة غير صالحة', () => {
    expect(isWorkspaceStatusConsistent({ status: 'active', frozenAt: 1 })).toBe(false)
  })

  it('حمل الحقلين معًا غير صالح لأي حالة', () => {
    expect(
      isWorkspaceStatusConsistent({ status: 'frozen', frozenAt: 1, archivedAt: 2 }),
    ).toBe(false)
  })
})

describe('isActivePageWithinWorkspace', () => {
  const workspaceId = asWorkspaceId('w1')
  const otherWorkspaceId = asWorkspaceId('w2')
  const pageInWorkspace = asSavedPageId('p1')
  const pageInOtherWorkspace = asSavedPageId('p2')

  const pages = [
    { id: pageInWorkspace, workspaceId },
    { id: pageInOtherWorkspace, workspaceId: otherWorkspaceId },
  ]

  it('لا activePageId يُعد حالة صالحة', () => {
    expect(isActivePageWithinWorkspace({ id: workspaceId }, pages)).toBe(true)
  })

  it('يقبل صفحة فعلًا ضمن صفحات المساحة نفسها', () => {
    expect(
      isActivePageWithinWorkspace(
        { id: workspaceId, activePageId: pageInWorkspace },
        pages,
      ),
    ).toBe(true)
  })

  it('يرفض صفحة تنتمي لمساحة أخرى', () => {
    expect(
      isActivePageWithinWorkspace(
        { id: workspaceId, activePageId: pageInOtherWorkspace },
        pages,
      ),
    ).toBe(false)
  })

  it('يرفض معرّف صفحة غير موجود إطلاقًا', () => {
    expect(
      isActivePageWithinWorkspace(
        { id: workspaceId, activePageId: asSavedPageId('ghost') },
        pages,
      ),
    ).toBe(false)
  })
})

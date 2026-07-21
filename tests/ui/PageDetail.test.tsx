import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PageDetail } from '../../src/ui/workspace/PageDetail'
import { createTranslator } from '../../src/i18n/messages'
import { asPageNoteId, asSavedPageId, asWorkspaceId } from '../../src/core/ids'
import type { SavedPage } from '../../src/core/page'

/**
 * تفاصيل الصفحة المرجعية: العودة في الرأس، ترويسة الصفحة، بُعدا التصنيف
 * المستقلان، الحقول، الملاحظات، الإجراء الأساسي «افتح الصفحة» — ولا واجهة
 * حذف صفحة (خارج V1).
 */

const t = createTranslator('ar')

function page(overrides: Partial<SavedPage> = {}): SavedPage {
  return {
    id: asSavedPageId('p1'),
    workspaceId: asWorkspaceId('w1'),
    url: 'https://sdaia.gov.sa/report',
    title: 'تقرير PIPL — نطاق التطبيق',
    capturedAt: 1000,
    order: 1024,
    progressStatus: 'in-progress',
    role: 'primary',
    reason: 'التحقق من تعريف البيانات الحساسة.',
    notes: [
      { id: asPageNoteId('n1'), body: 'قارن التعريف باستثناءات CCPA.', createdAt: 1, updatedAt: 1 },
    ],
    addedAt: 1000,
    updatedAt: 1000,
    ...overrides,
  }
}

function renderDetail(overrides: Partial<SavedPage> = {}) {
  const onSaveFields = vi.fn()
  const onAddNote = vi.fn()
  const onEditNote = vi.fn()
  const onDeleteNote = vi.fn()
  const onRemovePage = vi.fn()
  const onBack = vi.fn()

  render(
    <PageDetail
      language="ar"
      onAddNote={onAddNote}
      onBack={onBack}
      onDeleteNote={onDeleteNote}
      onEditNote={onEditNote}
      onRemovePage={onRemovePage}
      onSaveFields={onSaveFields}
      page={page(overrides)}
      saving={false}
      t={t}
    />,
  )
  return { onSaveFields, onAddNote, onEditNote, onDeleteNote, onRemovePage, onBack }
}

afterEach(() => {
  cleanup()
})

describe('البنية المرجعية', () => {
  it('العودة في الرأس لا شريطًا سفليًا، والإجراء السفلي «افتح الصفحة»', () => {
    const { onBack } = renderDetail()

    const header = document.querySelector('.panel-header')
    const back = header!.querySelector('button[aria-label="رجوع"]')
    expect(back).not.toBeNull()
    fireEvent.click(back as HTMLElement)
    expect(onBack).toHaveBeenCalled()

    const bottom = document.querySelector('.panel-bottom-action')
    expect(bottom?.textContent).toContain('افتح الصفحة')
    expect(bottom?.textContent).not.toContain('رجوع')
    expect(bottom?.querySelector('a')?.getAttribute('href')).toBe('https://sdaia.gov.sa/report')
  })

  it('الترويسة تعرض العنوان والرابط الخارجي', () => {
    renderDetail()

    expect(screen.getByText('تقرير PIPL — نطاق التطبيق')).toBeDefined()
    const link = document.querySelector('.page-detail-heading a')
    expect(link?.getAttribute('href')).toBe('https://sdaia.gov.sa/report')
    expect(link?.getAttribute('target')).toBe('_blank')
  })

  it('بُعدا التصنيف مستقلان: قائمتان منفصلتان للتقدم والدور', () => {
    renderDetail()

    expect(screen.getByLabelText('حالة التقدم')).toBeDefined()
    expect(screen.getByLabelText('دور الصفحة')).toBeDefined()
  })

  it('منطقة الخطر: الإلغاء لا يحذف، والتأكيد بأعداد حقيقية يحذف — قرار 0018', () => {
    const { onRemovePage } = renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'أزل الصفحة من المساحة' }))
    // لا حذف قبل التأكيد
    expect(onRemovePage).not.toHaveBeenCalled()

    const dialog = screen.getByRole('alertdialog')
    // أعداد حقيقية: اسم الصفحة وعدد ملاحظاتها
    expect(dialog.textContent).toContain('تقرير PIPL — نطاق التطبيق')
    expect(dialog.textContent).toContain('(1)')
    expect(dialog.textContent).toContain('لا يمكن التراجع')

    fireEvent.click(within(dialog).getByRole('button', { name: 'إلغاء' }))
    expect(onRemovePage).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'أزل الصفحة من المساحة' }))
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'أزل الصفحة من المساحة',
      }),
    )
    expect(onRemovePage).toHaveBeenCalledTimes(1)
  })
})

describe('الحفظ', () => {
  it('يجمع الحقول في patch واحد', () => {
    const { onSaveFields } = renderDetail()

    fireEvent.change(screen.getByLabelText('حالة التقدم'), { target: { value: 'complete' } })
    fireEvent.change(screen.getByLabelText(/سبب الفتح/), {
      target: { value: 'سبب محدث' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }))

    expect(onSaveFields).toHaveBeenCalledWith(
      expect.objectContaining({
        progressStatus: 'complete',
        reason: 'سبب محدث',
        role: 'primary',
      }),
    )
  })
})

describe('التواريخ', () => {
  it('تاريخ الإضافة وآخر تعديل من البيانات الحقيقية، ولا حفظ بمجرد العرض', () => {
    const added = new Date(2026, 6, 11).getTime()
    const updated = new Date(2026, 6, 17).getTime()
    const { onSaveFields } = renderDetail({ addedAt: added, updatedAt: updated })

    const expectedAdded = new Intl.DateTimeFormat('ar', { dateStyle: 'medium' }).format(added)
    const expectedUpdated = new Intl.DateTimeFormat('ar', { dateStyle: 'medium' }).format(updated)
    const text = document.body.textContent ?? ''
    expect(text).toContain(expectedAdded)
    expect(text).toContain(expectedUpdated)

    // مجرد عرض الشاشة لا يستدعي أي حفظ يرفع «آخر تعديل»
    expect(onSaveFields).not.toHaveBeenCalled()
  })
})

describe('الملاحظات', () => {
  it('تعرض الملاحظة وتاريخها وإجراءَي التحرير والحذف', () => {
    const { onDeleteNote } = renderDetail()

    expect(screen.getByText('قارن التعريف باستثناءات CCPA.')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'حذف' }))
    expect(onDeleteNote).toHaveBeenCalledWith(asPageNoteId('n1'))
  })

  it('زر حفظ الملاحظة معطل للفراغ والمسافات، وينشط بنص صالح', () => {
    renderDetail()

    const save = screen.getByRole('button', { name: /حفظ الملاحظة/ })
    expect((save as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(screen.getByLabelText(/إضافة ملاحظة/), { target: { value: '   ' } })
    expect((save as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(screen.getByLabelText(/إضافة ملاحظة/), { target: { value: 'نص صالح' } })
    expect((save as HTMLButtonElement).disabled).toBe(false)
  })

  it('إضافة ملاحظة تمرر النص وتفرغ الحقل', () => {
    const { onAddNote } = renderDetail()

    fireEvent.change(screen.getByLabelText(/إضافة ملاحظة/), {
      target: { value: 'ملاحظة جديدة' },
    })
    fireEvent.click(screen.getByRole('button', { name: /حفظ الملاحظة/ }))

    expect(onAddNote).toHaveBeenCalledWith('ملاحظة جديدة')
  })
})

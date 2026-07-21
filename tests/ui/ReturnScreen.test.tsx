import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ReturnScreen } from '../../src/ui/workspace/ReturnScreen'
import { createTranslator } from '../../src/i18n/messages'
import { asSavedPageId, asWorkspaceId } from '../../src/core/ids'
import type { Workspace } from '../../src/core/workspace'
import type { SavedPage } from '../../src/core/page'
import type { ReturnSummary } from '../../src/app/workspace-session'

/**
 * شاشة العودة — الترتيب الملزم (§10.3 هوية): التحية ووقت التجميد، فآخر ما
 * وصلت إليه (لا يُقص)، فالخطوة التالية بالبؤرة العنبرية، فما بقي باختيار
 * صريح، فنتيجة الاستعادة الصادقة، فمتابعة العمل.
 */

const t = createTranslator('ar')
const NOW = 100_000_000

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: asWorkspaceId('w1'),
    name: 'تحليل أطر الخصوصية',
    template: 'research',
    status: 'frozen',
    frozenAt: NOW - 40 * 3_600_000,
    lastReached: 'حددت ثلاثة اختلافات تحتاج تحققًا في نطاق التطبيق.',
    nextStep: 'راجع القسم الثالث من تقرير PIPL',
    createdAt: 1000,
    updatedAt: 1000,
    lastWorkedAt: NOW - 40 * 3_600_000,
    ...overrides,
  }
}

function page(id: string, overrides: Partial<SavedPage> = {}): SavedPage {
  return {
    id: asSavedPageId(id),
    workspaceId: asWorkspaceId('w1'),
    url: `https://example.org/${id}`,
    title: `صفحة ${id}`,
    capturedAt: 1000,
    order: 1024,
    progressStatus: 'in-progress',
    notes: [],
    addedAt: 1000,
    updatedAt: 1000,
    ...overrides,
  }
}

function summary(overrides: Partial<ReturnSummary> = {}): ReturnSummary {
  const pages = [page('p1', { role: 'primary' }), page('p2'), page('p3', { progressStatus: 'complete' })]
  return {
    workspace: workspace(),
    pages,
    remaining: pages.filter((candidate) => candidate.progressStatus !== 'complete'),
    important: pages.filter((candidate) => candidate.role === 'primary'),
    loadedAt: NOW,
    ...overrides,
  }
}

function renderReturn(
  props: Partial<Parameters<typeof ReturnScreen>[0]> = {},
) {
  const onRestore = vi.fn()
  const onSkip = vi.fn()
  const onContinue = vi.fn()
  render(
    <ReturnScreen
      language="ar"
      onContinue={onContinue}
      onRestore={onRestore}
      onSkip={onSkip}
      opening={false}
      results={undefined}
      summary={summary()}
      t={t}
      {...props}
    />,
  )
  return { onRestore, onSkip, onContinue }
}

afterEach(() => {
  cleanup()
})

describe('الترتيب الملزم', () => {
  it('التحية ثم نقطة التوقف ثم الخطوة التالية ثم ما بقي — بهذا الترتيب في المستند', () => {
    renderReturn()

    const markers = [
      screen.getByText('عُد إلى حيث توقفت.'),
      screen.getByText('آخر ما وصلت إليه'),
      screen.getByText('الخطوة التالية'),
      screen.getByText('ما بقي'),
    ]

    for (let index = 0; index < markers.length - 1; index += 1) {
      const before = markers[index]!
      const after = markers[index + 1]!
      // DOCUMENT_POSITION_FOLLOWING = 4
      expect(before.compareDocumentPosition(after) & 4).toBe(4)
    }
  })

  it('يعرض وقت التجميد ونص نقطة التوقف كاملًا', () => {
    renderReturn()

    expect(screen.getByText(/جُمّدت هذه المساحة/)).toBeDefined()
    expect(
      screen.getByText('حددت ثلاثة اختلافات تحتاج تحققًا في نطاق التطبيق.'),
    ).toBeDefined()
    expect(screen.getByText('راجع القسم الثالث من تقرير PIPL')).toBeDefined()
  })

  it('إجراء الصفحة الأساسية يفتح صفحة أساسية فعلًا', () => {
    renderReturn()

    const anchor = screen.getByText('افتح الصفحة الأساسية').closest('a')
    expect(anchor?.getAttribute('href')).toBe('https://example.org/p1')
    expect(anchor?.getAttribute('target')).toBe('_blank')
  })
})

describe('اختيار ما يُفتح', () => {
  it('لا فتح تلقائيًا: الفتح بالمحدد فقط وبطلب صريح', () => {
    const { onRestore } = renderReturn()

    // البدء بتحديد المتبقي (2)
    fireEvent.click(screen.getByRole('button', { name: 'فتح الصفحات المختارة' }))

    expect(onRestore).toHaveBeenCalledWith([asSavedPageId('p1'), asSavedPageId('p2')])
  })

  it('إلغاء تحديد صفحة يستثنيها من الفتح', () => {
    const { onRestore } = renderReturn()

    fireEvent.click(screen.getAllByRole('checkbox')[0]!)
    fireEvent.click(screen.getByRole('button', { name: 'فتح الصفحات المختارة' }))

    expect(onRestore).toHaveBeenCalledWith([asSavedPageId('p2')])
  })

  it('مخرج صريح يعرض المساحة دون فتح أي شيء', () => {
    const { onSkip, onRestore } = renderReturn()

    fireEvent.click(screen.getByRole('button', { name: 'عرض المساحة دون فتح' }))

    expect(onSkip).toHaveBeenCalled()
    expect(onRestore).not.toHaveBeenCalled()
  })
})

describe('نتيجة الاستعادة الصادقة', () => {
  it('تعرض الأعداد الثلاثة ونتيجة كل صفحة نصًا لا لونًا وحده', () => {
    renderReturn({
      results: [
        { pageId: asSavedPageId('p1'), title: 'صفحة p1', status: 'opened', linkKind: 'http' },
        { pageId: asSavedPageId('p2'), title: 'صفحة p2', status: 'unavailable', linkKind: 'http' },
      ],
    })

    expect(screen.getByText('نتيجة الفتح')).toBeDefined()
    // «فُتحت» تظهر في شريط الأعداد وفي نتيجة الصفحة النصية معًا
    expect(screen.getAllByText('فُتحت').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('تعذرت')).toBeDefined()
    expect(screen.getByText('لم تُطلب')).toBeDefined()
    expect(screen.getByText('تعذّر فتحها')).toBeDefined()
    // التفسير الصادق: فتح تبويب ليس استعادة موضع
    expect(
      screen.getByText(
        'فتح التبويب ليس استعادة لموضع القراءة؛ موضع القراءة غير محفوظ في هذه النسخة.',
      ),
    ).toBeDefined()
  })

  it('«متابعة العمل» بعد النتائج تدخل المساحة', () => {
    const { onContinue } = renderReturn({
      results: [
        { pageId: asSavedPageId('p1'), title: 'صفحة p1', status: 'opened', linkKind: 'http' },
      ],
    })

    fireEvent.click(screen.getByRole('button', { name: 'متابعة العمل' }))
    expect(onContinue).toHaveBeenCalled()
  })
})

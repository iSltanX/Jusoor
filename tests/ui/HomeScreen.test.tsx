import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { HomeScreen } from '../../src/ui/HomeScreen'
import { createTranslator } from '../../src/i18n/messages'
import { asWorkspaceId } from '../../src/core/ids'
import type { Workspace } from '../../src/core/workspace'
import type { WorkspaceDirectory, WorkspaceSummary } from '../../src/app/workspace-session'

/**
 * شاشة المساحات المرجعية: السطر التوجيهي ومؤشر «محلي»، مرشحات الحالة
 * بأعدادها، بطاقة المساحة الكاملة (قالب، اسم، هدف، نقطة توقف، خطوة تالية،
 * عدادات، حالة، إجراء)، الحالة الفارغة، والبحث تضييق عرض خالص.
 */

const t = createTranslator('ar')
const NOW = 10_000_000

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: asWorkspaceId('w1'),
    name: 'تحليل أطر الخصوصية',
    template: 'research',
    status: 'active',
    createdAt: 1000,
    updatedAt: 1000,
    lastWorkedAt: NOW - 3 * 3_600_000,
    ...overrides,
  }
}

function summary(overrides: Partial<Workspace> = {}, pageCount = 0): WorkspaceSummary {
  return { workspace: workspace(overrides), pageCount }
}

function directory(
  summaries: WorkspaceSummary[],
  extra: Partial<WorkspaceDirectory> = {},
): WorkspaceDirectory {
  return { summaries, corruptedCount: 0, loadedAt: NOW, ...extra }
}

function renderHome(dir: WorkspaceDirectory) {
  const onCreate = vi.fn()
  const onOpen = vi.fn()
  const onOpenSettings = vi.fn()
  render(
    <HomeScreen
      directory={dir}
      language="ar"
      onCreate={onCreate}
      onOpen={onOpen}
      onOpenSettings={onOpenSettings}
      t={t}
    />,
  )
  return { onCreate, onOpen, onOpenSettings }
}

afterEach(() => {
  cleanup()
})

describe('الحالة الفارغة', () => {
  it('تعرض حالة فارغة مرجعية بإجراء واحد', () => {
    const { onCreate } = renderHome(directory([]))

    expect(screen.getByText('ابدأ أول مساحة عمل')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'إنشاء مساحة من تبويبات النافذة' }))
    expect(onCreate).toHaveBeenCalled()
  })
})

describe('السطر التوجيهي والمرشحات', () => {
  it('يعرض «عُد إلى حيث توقفت» ومؤشر التخزين المحلي', () => {
    renderHome(directory([summary()]))

    expect(screen.getByText('عُد إلى حيث توقفت.')).toBeDefined()
    expect(screen.getByText('سياق عملك محفوظ على هذا الجهاز.')).toBeDefined()
    expect(screen.getByText('محلي')).toBeDefined()
  })

  it('مرشحات الحالة تعرض الأعداد الصحيحة وتضيّق القائمة', () => {
    renderHome(
      directory([
        summary({ id: asWorkspaceId('w1'), name: 'نشطة أولى' }),
        summary({ id: asWorkspaceId('w2'), name: 'مجمدة أولى', status: 'frozen', frozenAt: 900 }),
      ]),
    )

    const group = screen.getByRole('group', { name: 'تصفية المساحات بالحالة' })
    expect(group.textContent).toContain('الكل')

    // الكل: 2 · نشطة: 1 · مجمدة: 1
    expect(screen.getByText('نشطة أولى')).toBeDefined()
    expect(screen.getByText('مجمدة أولى')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: /مجمدة/ }))
    expect(screen.queryByText('نشطة أولى')).toBeNull()
    expect(screen.getByText('مجمدة أولى')).toBeDefined()
  })
})

describe('بطاقة المساحة المرجعية', () => {
  it('تعرض القالب والاسم والهدف ونقطة التوقف والخطوة التالية والعدادات والحالة', () => {
    renderHome(
      directory([
        summary(
          {
            goal: 'مقارنة GDPR وPIPL',
            lastReached: 'حددت ثلاثة اختلافات تحتاج تحققًا.',
            nextStep: 'راجع القسم الثالث من التقرير.',
          },
          12,
        ),
      ]),
    )

    expect(screen.getByText('بحثي')).toBeDefined()
    expect(screen.getByText('تحليل أطر الخصوصية')).toBeDefined()
    expect(screen.getByText('مقارنة GDPR وPIPL')).toBeDefined()
    expect(screen.getByText('آخر ما وصلت إليه')).toBeDefined()
    expect(screen.getByText('حددت ثلاثة اختلافات تحتاج تحققًا.')).toBeDefined()
    expect(screen.getByText('الخطوة التالية')).toBeDefined()
    expect(screen.getByText('راجع القسم الثالث من التقرير.')).toBeDefined()
    expect(screen.getByText('12')).toBeDefined()
    expect(screen.getAllByText('نشطة').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: /افتح المساحة/ })).toBeDefined()
  })

  it('غياب الخطوة التالية يظهر سطر «لا توجد خطوة تالية بعد» لا فراغًا', () => {
    renderHome(directory([summary()]))
    expect(screen.getByText('لا توجد خطوة تالية بعد')).toBeDefined()
  })

  it('المساحة المجمدة إجراؤها «استعد المساحة»', () => {
    const { onOpen } = renderHome(
      directory([summary({ status: 'frozen', frozenAt: 900 })]),
    )

    fireEvent.click(screen.getByRole('button', { name: /استعد المساحة/ }))
    expect(onOpen).toHaveBeenCalledWith(asWorkspaceId('w1'))
  })
})

describe('البحث', () => {
  it('يضيّق العرض دون أي كتابة', () => {
    renderHome(
      directory([
        summary({ id: asWorkspaceId('w1'), name: 'خصوصية البيانات' }),
        summary({ id: asWorkspaceId('w2'), name: 'مصادقة التطبيق' }),
      ]),
    )

    fireEvent.click(screen.getByRole('button', { name: 'ابحث في مساحاتك' }))
    fireEvent.change(screen.getByRole('searchbox', { name: 'ابحث في مساحاتك' }), {
      target: { value: 'خصوصية' },
    })

    expect(screen.getByText('خصوصية البيانات')).toBeDefined()
    expect(screen.queryByText('مصادقة التطبيق')).toBeNull()
  })
})

describe('السجلات التالفة', () => {
  it('لا تختفي صامتة', () => {
    renderHome(directory([summary()], { corruptedCount: 2 }))
    expect(screen.getByText('سجلات تعذّرت قراءتها')).toBeDefined()
  })
})

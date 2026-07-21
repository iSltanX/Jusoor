import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CreateWizard } from '../../src/ui/CreateWizard'
import { createTranslator } from '../../src/i18n/messages'
import { asWorkspaceId } from '../../src/core/ids'

/**
 * معالج الإنشاء المرجعي: مؤشر خطوات 1–2–3، الخطوة الأولى (اسم إلزامي،
 * بطاقات القوالب الثلاث، هدف اختياري)، الثانية (اختيار التبويبات ومسار
 * الصلاحية الصريح)، الثالثة (مراجعة ما سيُحفظ)، والإنشاء الفعلي فارغًا أو
 * من التبويبات المختارة.
 */

const loadWindowTabs = vi.fn()
const createWorkspaceFromSelectedTabs = vi.fn()
const requestTabsPermission = vi.fn()
const createEmptyWorkspace = vi.fn()

vi.mock('../../src/app/workspace-creation', () => ({
  loadWindowTabs: (...a: unknown[]) => loadWindowTabs(...a) as unknown,
  createWorkspaceFromSelectedTabs: (...a: unknown[]) =>
    createWorkspaceFromSelectedTabs(...a) as unknown,
}))

vi.mock('../../src/app/permissions', () => ({
  hasTabsPermission: vi.fn(),
  requestTabsPermission: (...a: unknown[]) => requestTabsPermission(...a) as unknown,
}))

vi.mock('../../src/app/workspace-session', () => ({
  createEmptyWorkspace: (...a: unknown[]) => createEmptyWorkspace(...a) as unknown,
}))

const t = createTranslator('ar')

function tabsPreview(usable: { title: string; url: string; index: number }[]) {
  return {
    ok: true,
    value: {
      usable: usable.map((tab) => ({ ...tab, active: false })),
      unavailable: [],
      hasTabsPermission: true,
      needsPermission: false,
    },
  }
}

function renderWizard() {
  const onCancel = vi.fn()
  const onCreated = vi.fn()
  render(<CreateWizard language="ar" onCancel={onCancel} onCreated={onCreated} t={t} />)
  return { onCancel, onCreated }
}

beforeEach(() => {
  vi.clearAllMocks()
  loadWindowTabs.mockResolvedValue(tabsPreview([]))
})

afterEach(() => {
  cleanup()
})

describe('الخطوة الأولى', () => {
  it('تعرض العنوان وبطاقات القوالب الثلاث والهدف الاختياري', async () => {
    renderWizard()

    expect(await screen.findByText('ما الذي تعمل عليه؟')).toBeDefined()
    expect(screen.getByRole('button', { name: /عام/ })).toBeDefined()
    expect(screen.getByRole('button', { name: /بحثي/ })).toBeDefined()
    expect(screen.getByRole('button', { name: /تطويري/ })).toBeDefined()
    expect(screen.getByText('الهدف أو السؤال')).toBeDefined()
  })

  it('لا تتقدم بلا اسم وتربط الخطأ بالحقل', async () => {
    renderWizard()
    await screen.findByText('ما الذي تعمل عليه؟')

    fireEvent.click(screen.getByRole('button', { name: 'متابعة' }))

    expect(screen.getByText('اكتب اسمًا للمساحة.')).toBeDefined()
    expect(screen.getByText('ما الذي تعمل عليه؟')).toBeDefined()
  })

  it('اختيار القالب يعلَّم بحالة مضغوطة', async () => {
    renderWizard()
    await screen.findByText('ما الذي تعمل عليه؟')

    const research = screen.getByRole('button', { name: /بحثي/ })
    fireEvent.click(research)
    expect(research.getAttribute('aria-pressed')).toBe('true')
  })
})

describe('الخطوة الثانية', () => {
  it('تعرض تبويبات النافذة للاختيار وتحدّثها بالتحديد', async () => {
    loadWindowTabs.mockResolvedValue(
      tabsPreview([
        { title: 'مقارنة الأطر', url: 'https://iapp.org/a', index: 0 },
        { title: 'تقرير PIPL', url: 'https://sdaia.gov.sa/r', index: 1 },
      ]),
    )
    renderWizard()
    await screen.findByText('ما الذي تعمل عليه؟')

    fireEvent.change(screen.getByLabelText(/اسم المساحة/), { target: { value: 'تحليل' } })
    fireEvent.click(screen.getByRole('button', { name: 'متابعة' }))

    expect(await screen.findByText('اختر الصفحات')).toBeDefined()
    expect(screen.getByText('مقارنة الأطر')).toBeDefined()
    expect(screen.getByText('تقرير PIPL')).toBeDefined()
    // البدء بتحديد الكل
    expect(screen.getByText('2 / 2')).toBeDefined()
  })

  it('غياب الصلاحية يعرض طلبها الصريح ولا يطلبها تلقائيًا', async () => {
    loadWindowTabs.mockResolvedValue({
      ok: true,
      value: { usable: [], unavailable: [], hasTabsPermission: false, needsPermission: true },
    })
    renderWizard()
    await screen.findByText('ما الذي تعمل عليه؟')

    fireEvent.change(screen.getByLabelText(/اسم المساحة/), { target: { value: 'تحليل' } })
    fireEvent.click(screen.getByRole('button', { name: 'متابعة' }))

    expect(await screen.findByText('قراءة تبويبات هذه النافذة')).toBeDefined()
    expect(requestTabsPermission).not.toHaveBeenCalled()

    requestTabsPermission.mockResolvedValue({ granted: true })
    loadWindowTabs.mockResolvedValue(tabsPreview([{ title: 'صفحة', url: 'https://a.b', index: 0 }]))
    fireEvent.click(screen.getByRole('button', { name: 'السماح بقراءة التبويبات' }))

    expect(await screen.findByText('صفحة')).toBeDefined()
  })
})

describe('تنقل الـWizard', () => {
  it('لا سهم رجوع في الخطوة الأولى — X وحده للإلغاء', async () => {
    const { onCancel } = renderWizard()
    await screen.findByText('ما الذي تعمل عليه؟')

    const header = document.querySelector('.panel-header')
    expect(header!.querySelector('button[aria-label="رجوع"]')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('سهم الرأس يظهر في الخطوة الثانية ويرجع خطوة واحدة، ولا زر «سابق» سفليًا', async () => {
    renderWizard()
    await screen.findByText('ما الذي تعمل عليه؟')

    fireEvent.change(screen.getByLabelText(/اسم المساحة/), { target: { value: 'تحليل' } })
    fireEvent.click(screen.getByRole('button', { name: 'متابعة' }))
    await screen.findByText('اختر الصفحات')

    // لا تكرار للرجوع: الشريط السفلي بلا «السابق»
    const bottom = document.querySelector('.panel-bottom-action')
    expect(bottom?.textContent).not.toContain('السابق')

    const back = document.querySelector('.panel-header button[aria-label="رجوع"]')
    expect(back).not.toBeNull()
    fireEvent.click(back as HTMLElement)
    expect(await screen.findByText('ما الذي تعمل عليه؟')).toBeDefined()
  })

  it('رسالة الروابط المتكررة تعرض العدد الفعلي لا {count}', async () => {
    loadWindowTabs.mockResolvedValue(
      tabsPreview([
        { title: 'أولى', url: 'https://a.example/1', index: 0 },
        { title: 'نسخة', url: 'https://a.example/1', index: 1 },
      ]),
    )
    createWorkspaceFromSelectedTabs.mockResolvedValue({
      ok: true,
      value: { created: false, duplicates: [{ url: 'https://a.example/1' }] },
    })
    renderWizard()
    await screen.findByText('ما الذي تعمل عليه؟')

    fireEvent.change(screen.getByLabelText(/اسم المساحة/), { target: { value: 'تحليل' } })
    fireEvent.click(screen.getByRole('button', { name: 'متابعة' }))
    await screen.findByText('اختر الصفحات')
    fireEvent.click(screen.getByRole('button', { name: 'متابعة' }))
    await screen.findByText('راجع ما سيُحفظ')
    fireEvent.click(screen.getByRole('button', { name: 'أنشئ المساحة' }))

    expect(await screen.findByText('روابط متكررة في اختيارك')).toBeDefined()
    const body = document.body.textContent ?? ''
    expect(body).not.toContain('{count}')
    expect(screen.getByText(/مجموعات متطابقة: 1/)).toBeDefined()
  })
})

describe('الخطوة الثالثة والإنشاء', () => {
  it('بلا صفحات مختارة تنشئ مساحة فارغة بالقالب المختار', async () => {
    createEmptyWorkspace.mockResolvedValue({
      ok: true,
      value: { id: asWorkspaceId('w9'), name: 'تحليل' },
    })
    const { onCreated } = renderWizard()
    await screen.findByText('ما الذي تعمل عليه؟')

    fireEvent.change(screen.getByLabelText(/اسم المساحة/), { target: { value: 'تحليل' } })
    fireEvent.click(screen.getByRole('button', { name: /بحثي/ }))
    fireEvent.click(screen.getByRole('button', { name: 'متابعة' }))
    await screen.findByText('اختر الصفحات')
    fireEvent.click(screen.getByRole('button', { name: 'متابعة' }))

    expect(await screen.findByText('راجع ما سيُحفظ')).toBeDefined()
    expect(screen.getByText('الاسم والهدف والقالب')).toBeDefined()
    expect(screen.getByText('لا مزامنة ولا حساب')).toBeDefined()
    expect(screen.getByText('لا نرسل محتوى الصفحات إلى أي خدمة.')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'أنشئ المساحة' }))

    await waitFor(() => {
      expect(createEmptyWorkspace).toHaveBeenCalledWith({ name: 'تحليل', template: 'research' })
    })
    await waitFor(() => {
      expect(onCreated).toHaveBeenCalled()
    })
  })

  it('مع صفحات مختارة تنشئ من التبويبات المختارة وحدها', async () => {
    loadWindowTabs.mockResolvedValue(
      tabsPreview([
        { title: 'أولى', url: 'https://a.example/1', index: 0 },
        { title: 'ثانية', url: 'https://a.example/2', index: 1 },
      ]),
    )
    createWorkspaceFromSelectedTabs.mockResolvedValue({
      ok: true,
      value: { created: true, workspace: { id: asWorkspaceId('w2'), name: 'تحليل' }, pages: [] },
    })
    const { onCreated } = renderWizard()
    await screen.findByText('ما الذي تعمل عليه؟')

    fireEvent.change(screen.getByLabelText(/اسم المساحة/), { target: { value: 'تحليل' } })
    fireEvent.click(screen.getByRole('button', { name: 'متابعة' }))
    await screen.findByText('اختر الصفحات')

    // إلغاء تحديد الثانية
    fireEvent.click(screen.getAllByRole('button', { name: /تبويبات النافذة الحالية/ })[1]!)
    fireEvent.click(screen.getByRole('button', { name: 'متابعة' }))
    await screen.findByText('راجع ما سيُحفظ')

    fireEvent.click(screen.getByRole('button', { name: 'أنشئ المساحة' }))

    await waitFor(() => {
      expect(createWorkspaceFromSelectedTabs).toHaveBeenCalled()
    })
    const input = createWorkspaceFromSelectedTabs.mock.calls[0]?.[0] as {
      workspace: { name: string }
      selectedTabs: { url: string }[]
    }
    expect(input.workspace.name).toBe('تحليل')
    expect(input.selectedTabs.map((tab) => tab.url)).toEqual(['https://a.example/1'])
    await waitFor(() => {
      expect(onCreated).toHaveBeenCalled()
    })
  })

  it('مؤشر الخطوات يعلّم الحالية والمكتملة', async () => {
    renderWizard()
    await screen.findByText('ما الذي تعمل عليه؟')

    const stepper = screen.getByLabelText('تقدم الإنشاء')
    expect(stepper.querySelectorAll('span.active').length).toBe(1)

    fireEvent.change(screen.getByLabelText(/اسم المساحة/), { target: { value: 'تحليل' } })
    fireEvent.click(screen.getByRole('button', { name: 'متابعة' }))
    await screen.findByText('اختر الصفحات')

    expect(stepper.querySelectorAll('span.active').length).toBe(2)
  })
})

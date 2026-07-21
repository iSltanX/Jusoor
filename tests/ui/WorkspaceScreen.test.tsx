import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WorkspaceScreen } from '../../src/ui/workspace/WorkspaceScreen'
import { createTranslator } from '../../src/i18n/messages'
import { asSavedPageId, asWorkspaceId } from '../../src/core/ids'
import type { Workspace } from '../../src/core/workspace'
import type { SavedPage } from '../../src/core/page'

/**
 * داخل المساحة المرجعية: العودة في الرأس، hero بالقالب والحالة والأعداد،
 * زوج السياق بالبؤرة العنبرية، البحث والمرشحات، بطاقات الصفحات بالإفصاح
 * التدريجي، والإجراءان السفليان «جمّد المساحة» و«تابع الخطوة».
 */

const openWorkspace = vi.fn()
const loadReturnSummary = vi.fn()
const freezeWorkspaceNow = vi.fn()
const saveCheckpoint = vi.fn()
const savePageToWorkspace = vi.fn()
const removePageFromWorkspace = vi.fn()
const deleteWorkspaceNow = vi.fn()

vi.mock('../../src/app/workspace-session', () => ({
  openWorkspace: (...a: unknown[]) => openWorkspace(...a) as unknown,
  loadReturnSummary: (...a: unknown[]) => loadReturnSummary(...a) as unknown,
  freezeWorkspaceNow: (...a: unknown[]) => freezeWorkspaceNow(...a) as unknown,
  restoreWorkspace: vi.fn(),
  saveCheckpoint: (...a: unknown[]) => saveCheckpoint(...a) as unknown,
  saveWorkspaceFields: vi.fn(),
  savePageToWorkspace: (...a: unknown[]) => savePageToWorkspace(...a) as unknown,
  savePageFields: vi.fn(),
  savePageOrder: vi.fn(),
  savePageNote: vi.fn(),
  editPageNote: vi.fn(),
  removePageNote: vi.fn(),
  removePageFromWorkspace: (...a: unknown[]) => removePageFromWorkspace(...a) as unknown,
  deleteWorkspaceNow: (...a: unknown[]) => deleteWorkspaceNow(...a) as unknown,
  inspectCurrentTab: vi.fn(),
}))

vi.mock('../../src/app/permissions', () => ({
  hasTabsPermission: vi.fn(),
  requestTabsPermission: vi.fn(),
}))

vi.mock('../../src/app/transfer', () => ({
  exportWorkspace: vi.fn(),
  exportAllWorkspaces: vi.fn(),
  inspectImport: vi.fn(),
  applyImport: vi.fn(),
  IMPORT_RESOLUTIONS: ['create-copy', 'replace', 'merge-pages', 'cancel'],
}))

const t = createTranslator('ar')

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: asWorkspaceId('w1'),
    name: 'تحليل أطر الخصوصية',
    goal: 'مقارنة GDPR وPIPL من منظور تقني',
    template: 'research',
    status: 'active',
    lastReached: 'حددت ثلاثة اختلافات.',
    nextStep: 'راجع القسم الثالث.',
    activePageId: asSavedPageId('p1'),
    createdAt: 1000,
    updatedAt: 1000,
    lastWorkedAt: 1000,
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
    reason: 'التحقق من نطاق الالتزامات.',
    notes: [
      { id: 'n1' as SavedPage['notes'][number]['id'], body: 'ملاحظة أولى', createdAt: 1, updatedAt: 1 },
    ],
    addedAt: 1000,
    updatedAt: 1000,
    ...overrides,
  }
}

function view(overrides: Partial<{ workspace: Workspace; pages: SavedPage[] }> = {}) {
  return {
    ok: true,
    value: {
      workspace: workspace(),
      pages: [page('p1', { role: 'primary' }), page('p2', { progressStatus: 'complete' })],
      corruptedPages: [],
      ...overrides,
    },
  }
}

function renderScreen() {
  const onBack = vi.fn()
  render(
    <WorkspaceScreen
      language="ar"
      onBack={onBack}
      t={t}
      workspaceId={asWorkspaceId('w1')}
    />,
  )
  return { onBack }
}

beforeEach(() => {
  vi.clearAllMocks()
  openWorkspace.mockResolvedValue(view())
})

afterEach(() => {
  cleanup()
})

describe('البنية المرجعية', () => {
  it('العودة في الرأس واسم المساحة عنوانًا — لا شريط رجوع سفلي', async () => {
    const { onBack } = renderScreen()

    expect(await screen.findByText('تحليل أطر الخصوصية')).toBeDefined()

    const header = document.querySelector('.panel-header')
    expect(header).not.toBeNull()
    const backButton = header!.querySelector('button[aria-label="رجوع"]')
    expect(backButton).not.toBeNull()

    fireEvent.click(backButton as HTMLElement)
    expect(onBack).toHaveBeenCalled()

    // لا زر «رجوع» في المنطقة السفلية
    const bottom = document.querySelector('.panel-bottom-action')
    expect(bottom?.textContent).not.toContain('رجوع')
  })

  it('hero يعرض القالب والحالة والهدف وملخص الأعداد', async () => {
    renderScreen()
    await screen.findByText('تحليل أطر الخصوصية')

    expect(screen.getByText('بحثي')).toBeDefined()
    expect(screen.getByText('نشطة')).toBeDefined()
    expect(screen.getByText('مقارنة GDPR وPIPL من منظور تقني')).toBeDefined()

    const summary = document.querySelector('.workspace-summary')
    expect(summary?.textContent).toContain('صفحة')
    expect(summary?.textContent).toContain('غير مكتملة')
    expect(summary?.textContent).toContain('ملاحظات')
  })

  it('زوج السياق: نقطة التوقف ثم الخطوة التالية بإجراء البدء', async () => {
    renderScreen()
    await screen.findByText('تحليل أطر الخصوصية')

    expect(screen.getByText('حددت ثلاثة اختلافات.')).toBeDefined()
    expect(screen.getByText('راجع القسم الثالث.')).toBeDefined()

    const start = screen.getByText('ابدأ').closest('a')
    expect(start?.getAttribute('href')).toBe('https://example.org/p1')
  })

  it('«تابع الخطوة» في الأسفل يفتح التبويب النشط المحفوظ', async () => {
    renderScreen()
    await screen.findByText('تحليل أطر الخصوصية')

    const next = screen.getByText('تابع الخطوة').closest('a')
    expect(next?.getAttribute('href')).toBe('https://example.org/p1')
    expect(next?.className).toContain('primary')
  })
})

describe('منشئ السياق في الرأس', () => {
  it('زر مدمج برمز جُسور الرسمي ونص «سياق» — لا copy ولا file', async () => {
    renderScreen()
    await screen.findByText('تحليل أطر الخصوصية')

    const builder = document.querySelector('.panel-header button[aria-label="فتح منشئ السياق"]')
    expect(builder).not.toBeNull()
    // الرمز الرسمي أصل صورة من الحزمة (لا SVG مرسوم) ولا ينعكس في RTL
    const mark = builder!.querySelector('img.jusoor-mark')
    expect(mark).not.toBeNull()
    expect(mark!.className).not.toContain('icon-mirrored')
    expect(builder!.textContent).toContain('سياق')
    // لا أيقونة copy (مستطيلا النسخ) ولا file (ورقة الملف) داخل الزر
    expect(builder!.innerHTML).not.toContain('x="8" y="8" width="11"')
    expect(builder!.innerHTML).not.toContain('M6 3h8l4 4v14H6z')
    expect(document.querySelector('.panel-header button[aria-label*="نسخ"]')).toBeNull()
  })
})

describe('بطاقة نقطة التوقف', () => {
  it('البطاقة كلها زر إفصاح: النقر عليها يفتح المحرر ويحدّث aria', async () => {
    renderScreen()
    await screen.findByText('تحليل أطر الخصوصية')

    const toggle = screen.getByRole('button', { expanded: false, name: /آخر ما وصلت إليه/ })
    expect(toggle.getAttribute('aria-controls')).toBe('checkpoint-editor')
    expect(document.getElementById('checkpoint-editor')).toBeNull()

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    const editor = document.getElementById('checkpoint-editor')
    expect(editor).not.toBeNull()
    expect(editor!.textContent).toContain('الخطوة التالية')

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(document.getElementById('checkpoint-editor')).toBeNull()
  })

  it('لا يفتح المحرر تلقائيًا عند دخول الشاشة', async () => {
    renderScreen()
    await screen.findByText('تحليل أطر الخصوصية')
    expect(document.getElementById('checkpoint-editor')).toBeNull()
  })
})

describe('هدف «تابع الخطوة»', () => {
  it('يفضّل الصفحة الأساسية غير المكتملة عند غياب تبويب نشط محفوظ', async () => {
    const { activePageId: _dropped, ...withoutActive } = workspace()
    void _dropped
    openWorkspace.mockResolvedValue(
      view({
        workspace: withoutActive,
        pages: [
          page('p9', { role: 'supporting' }),
          page('p1', { role: 'primary' }),
        ],
      }),
    )
    renderScreen()
    await screen.findByText('تحليل أطر الخصوصية')

    const next = screen.getByText('تابع الخطوة').closest('a')
    expect(next?.getAttribute('href')).toBe('https://example.org/p1')
  })

  it('بلا صفحات لا رابط فتح — إجراء صادق بديل', async () => {
    openWorkspace.mockResolvedValue(view({ pages: [] }))
    renderScreen()
    await screen.findByText('تحليل أطر الخصوصية')

    expect(screen.queryByText('تابع الخطوة')).toBeNull()
    const bottom = document.querySelector('.panel-bottom-action')
    expect(bottom?.textContent).toContain('إضافة صفحة')
  })
})

describe('حذف المساحة — قرار 0018', () => {
  it('الإلغاء لا يحذف شيئًا، والتأكيد بأعداد حقيقية يحذف ويعود للقائمة', async () => {
    deleteWorkspaceNow.mockResolvedValue({ ok: true, value: { deletedPages: 2 } })
    const { onBack } = renderScreen()
    await screen.findByText('تحليل أطر الخصوصية')

    fireEvent.click(screen.getByRole('button', { name: 'حذف المساحة' }))
    expect(deleteWorkspaceNow).not.toHaveBeenCalled()

    const dialog = screen.getByRole('alertdialog')
    // أعداد حقيقية: صفحتان وملاحظة واحدة (كل صفحة تحمل ملاحظة في العيّنة → 2)
    expect(dialog.textContent).toContain('2')
    expect(dialog.textContent).toContain('لا يمكن التراجع')

    fireEvent.click(within(dialog).getByRole('button', { name: 'إلغاء' }))
    expect(deleteWorkspaceNow).not.toHaveBeenCalled()
    expect(onBack).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'حذف المساحة' }))
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'حذف المساحة' }),
    )

    await waitFor(() => {
      expect(deleteWorkspaceNow).toHaveBeenCalledWith(asWorkspaceId('w1'))
    })
    await waitFor(() => {
      expect(onBack).toHaveBeenCalled()
    })
  })

  it('فشل التخزين: رسالة صادقة والبيانات باقية ولا عودة', async () => {
    deleteWorkspaceNow.mockResolvedValue({ ok: false, error: { kind: 'unexpected' } })
    const { onBack } = renderScreen()
    await screen.findByText('تحليل أطر الخصوصية')

    fireEvent.click(screen.getByRole('button', { name: 'حذف المساحة' }))
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'حذف المساحة' }),
    )

    expect(await screen.findByText('تعذر الحذف')).toBeDefined()
    expect(onBack).not.toHaveBeenCalled()
    // الشاشة ما زالت تعرض بيانات المساحة
    expect(screen.getByText('تحليل أطر الخصوصية')).toBeDefined()
  })
})

describe('بطاقات الصفحات', () => {
  it('تعرض التقدم والدور وسبب الفتح وعدد الملاحظات', async () => {
    renderScreen()
    await screen.findByText('تحليل أطر الخصوصية')

    expect(screen.getByText('صفحة p1')).toBeDefined()
    expect(screen.getAllByText('قيد العمل').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('أساسية')).toBeDefined()
    expect(screen.getAllByText(/التحقق من نطاق الالتزامات/).length).toBeGreaterThanOrEqual(1)
  })

  it('التوسيع بالنقر على مساحة البطاقة غير التفاعلية، والطي كذلك', async () => {
    renderScreen()
    await screen.findByText('تحليل أطر الخصوصية')

    // النقر على نص سبب الفتح (مساحة غير تفاعلية) يوسّع
    fireEvent.click(screen.getAllByText(/التحقق من نطاق الالتزامات/)[0]!)
    expect(screen.getByText('آخر ملاحظة')).toBeDefined()
    expect(screen.getByText('ملاحظة أولى')).toBeDefined()

    // والنقر عليها ثانية يطوي
    fireEvent.click(screen.getAllByText(/التحقق من نطاق الالتزامات/)[0]!)
    expect(screen.queryByText('آخر ملاحظة')).toBeNull()
  })

  it('مشغل chevron يحمل aria-expanded/controls ويعمل بلوحة المفاتيح', async () => {
    renderScreen()
    await screen.findByText('تحليل أطر الخصوصية')

    const toggles = screen.getAllByRole('button', { name: /توسيع بطاقة الصفحة/ })
    const toggle = toggles[0]!
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(toggle.getAttribute('aria-controls')).toContain('page-expanded-')

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)).not.toBeNull()
  })

  it('الأفعال الداخلية لا تطوي البطاقة: افتح الصفحة والتفاصيل مستقلان', async () => {
    renderScreen()
    await screen.findByText('تحليل أطر الخصوصية')

    fireEvent.click(screen.getAllByText(/التحقق من نطاق الالتزامات/)[0]!)
    const open = screen.getByText('افتح الصفحة').closest('a')!
    expect(open.getAttribute('href')).toBe('https://example.org/p1')

    fireEvent.click(open)
    // البطاقة ما زالت موسعة بعد النقر على الفعل الداخلي
    expect(screen.getByText('آخر ملاحظة')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'التفاصيل' }))
    expect(await screen.findByText('تفاصيل الصفحة')).toBeDefined()
  })

  it('مرشح «قيد العمل» يضيّق القائمة بعدّ صادق', async () => {
    renderScreen()
    await screen.findByText('تحليل أطر الخصوصية')

    const chips = document.querySelector('.filter-row')
    expect(chips).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /قيد العمل 1/ }))
    expect(screen.queryByText('صفحة p2')).toBeNull()
    expect(screen.getByText(/المعروض: 1 من 2/)).toBeDefined()
  })
})

describe('التجميد', () => {
  it('يفتح شاشة التجميد وإغلاق التبويبات يمر بحوار تأكيد مرجعي', async () => {
    freezeWorkspaceNow.mockResolvedValue({
      ok: true,
      value: { workspace: workspace({ status: 'frozen', frozenAt: 2000 }), closedTabs: 2, needsTabsPermission: false, closeFailed: false },
    })
    renderScreen()
    await screen.findByText('تحليل أطر الخصوصية')

    fireEvent.click(screen.getByRole('button', { name: /تجميد المساحة/ }))
    expect(await screen.findAllByText('تجميد المساحة')).toBeDefined()

    // «جمّد وأغلق» لا ينفَّذ مباشرة: حوار تأكيد أولًا
    fireEvent.click(screen.getByRole('button', { name: 'تجميد وإغلاق التبويبات' }))
    expect(freezeWorkspaceNow).not.toHaveBeenCalled()

    const dialog = await screen.findByRole('alertdialog')
    expect(dialog.textContent).toContain('إغلاق تبويبات المساحة؟')

    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'تجميد وإغلاق التبويبات' }))
    await waitFor(() => {
      expect(freezeWorkspaceNow).toHaveBeenCalledWith(
        expect.objectContaining({ closeOpenTabs: true }),
      )
    })
  })
})

describe('المساحة المجمدة', () => {
  it('تُفتح على شاشة العودة أولًا', async () => {
    openWorkspace.mockResolvedValue(view({ workspace: workspace({ status: 'frozen', frozenAt: 2000 }) }))
    loadReturnSummary.mockResolvedValue({
      ok: true,
      value: {
        workspace: workspace({ status: 'frozen', frozenAt: 2000 }),
        pages: [page('p1')],
        remaining: [page('p1')],
        important: [],
        loadedAt: 5000,
      },
    })

    renderScreen()

    expect(await screen.findByText('عُد إلى حيث توقفت.')).toBeDefined()
    expect(screen.getByText('ما بقي')).toBeDefined()
  })
})

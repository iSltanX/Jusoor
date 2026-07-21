import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SidePanelApp } from '../../src/ui/SidePanelApp'
import { asWorkspaceId } from '../../src/core/ids'
import type { Workspace } from '../../src/core/workspace'

/**
 * التركيب والتنقل: أول تشغيل يظهر مرة واحدة ويُحفظ إكماله محليًا، لا شاشة
 * ترحيب وسيطة بعده، والإعدادات صفوف مرجعية تقود إلى حول والاستيراد وإعادة
 * التعريف.
 */

const loadWorkspaceDirectory = vi.fn()
const rememberLastWorkspace = vi.fn()
const openWorkspace = vi.fn()
const markFirstRunSeen = vi.fn()
const hasTabsPermission = vi.fn()

let storedSettings = { language: 'ar', theme: 'light', firstRunSeen: true }

vi.mock('../../src/app/workspace-session', () => ({
  loadWorkspaceDirectory: (...a: unknown[]) => loadWorkspaceDirectory(...a) as unknown,
  rememberLastWorkspace: (...a: unknown[]) => rememberLastWorkspace(...a) as unknown,
  createEmptyWorkspace: vi.fn(),
  openWorkspace: (...a: unknown[]) => openWorkspace(...a) as unknown,
  loadReturnSummary: vi.fn(),
  freezeWorkspaceNow: vi.fn(),
  restoreWorkspace: vi.fn(),
  saveCheckpoint: vi.fn(),
  saveWorkspaceFields: vi.fn(),
  savePageToWorkspace: vi.fn(),
  savePageFields: vi.fn(),
  savePageOrder: vi.fn(),
  savePageNote: vi.fn(),
  editPageNote: vi.fn(),
  removePageNote: vi.fn(),
  removePageFromWorkspace: vi.fn(),
  deleteWorkspaceNow: vi.fn(),
  inspectCurrentTab: vi.fn(),
}))

vi.mock('../../src/app/settings', () => ({
  loadSettings: () =>
    Promise.resolve({ settings: storedSettings, language: 'ar', direction: 'rtl' }),
  setLanguagePreference: vi.fn(),
  setThemePreference: vi.fn(),
  markFirstRunSeen: (...a: unknown[]) => {
    markFirstRunSeen(...a)
    storedSettings = { ...storedSettings, firstRunSeen: true }
    return Promise.resolve({
      settings: storedSettings,
      language: 'ar',
      direction: 'rtl',
    })
  },
}))

vi.mock('../../src/app/about', () => ({
  getExtensionVersion: () => '1.0.0',
}))

vi.mock('../../src/app/permissions', () => ({
  hasTabsPermission: (...a: unknown[]) => hasTabsPermission(...a) as unknown,
  requestTabsPermission: vi.fn(),
}))

vi.mock('../../src/app/transfer', () => ({
  exportWorkspace: vi.fn(),
  exportAllWorkspaces: vi.fn(),
  inspectImport: vi.fn(),
  applyImport: vi.fn(),
  IMPORT_RESOLUTIONS: ['create-copy', 'replace', 'merge-pages', 'cancel'],
}))

vi.mock('../../src/app/workspace-creation', () => ({
  loadWindowTabs: vi.fn().mockResolvedValue({
    ok: true,
    value: { usable: [], unavailable: [], hasTabsPermission: true, needsPermission: false },
  }),
  createWorkspaceFromSelectedTabs: vi.fn(),
}))

const NOW = 5_000_000

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: asWorkspaceId('w1'),
    name: 'مساحة قائمة',
    template: 'general',
    status: 'active',
    createdAt: 1000,
    updatedAt: 1000,
    lastWorkedAt: NOW,
    ...overrides,
  }
}

function directory(workspaces: Workspace[] = []) {
  return {
    ok: true,
    value: {
      summaries: workspaces.map((item) => ({ workspace: item, pageCount: 0 })),
      corruptedCount: 0,
      loadedAt: NOW,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  storedSettings = { language: 'ar', theme: 'light', firstRunSeen: true }
  loadWorkspaceDirectory.mockResolvedValue(directory([workspace()]))
  openWorkspace.mockResolvedValue({ ok: true, value: { workspace: workspace(), pages: [], corruptedPages: [] } })
  hasTabsPermission.mockResolvedValue(false)
})

afterEach(() => {
  cleanup()
})

describe('أول تشغيل', () => {
  it('يظهر عند أول استخدام فقط ويكمل بثلاث شرائح ثم يُحفظ محليًا', async () => {
    storedSettings = { ...storedSettings, firstRunSeen: false }

    render(<SidePanelApp />)

    expect(await screen.findByText('احفظ سياق العمل، لا التبويبات فقط.')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'متابعة' }))
    expect(screen.getByText('بياناتك محلية.')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'متابعة' }))
    expect(screen.getByText('صلاحية التبويبات اختيارية.')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'ابدأ' }))

    await waitFor(() => {
      expect(markFirstRunSeen).toHaveBeenCalledTimes(1)
    })
    // بعد الإكمال تظهر المساحات — لا شاشة ترحيب وسيطة
    expect(await screen.findByText('مساحاتك')).toBeDefined()
  })

  it('«تخطي» يكمل أول تشغيل أيضًا فلا يظهر مجددًا', async () => {
    storedSettings = { ...storedSettings, firstRunSeen: false }

    render(<SidePanelApp />)
    await screen.findByText('احفظ سياق العمل، لا التبويبات فقط.')

    fireEvent.click(screen.getByRole('button', { name: 'تخطي' }))

    await waitFor(() => {
      expect(markFirstRunSeen).toHaveBeenCalledTimes(1)
    })
  })

  it('لا يظهر حين سبق إكماله، ولا زر «فتح جُسور» وسيطًا في أي مكان', async () => {
    render(<SidePanelApp />)

    expect(await screen.findByText('مساحاتك')).toBeDefined()
    expect(screen.queryByText('احفظ سياق العمل، لا التبويبات فقط.')).toBeNull()
    expect(screen.queryByText('فتح جُسور')).toBeNull()
    expect(markFirstRunSeen).not.toHaveBeenCalled()
  })
})

describe('التنقل', () => {
  it('فتح مساحة يسجلها آخر مساحة مستخدمة', async () => {
    render(<SidePanelApp />)
    await screen.findByText('مساحاتك')

    fireEvent.click(screen.getByRole('button', { name: /افتح المساحة/ }))
    expect(rememberLastWorkspace).toHaveBeenCalledWith(asWorkspaceId('w1'))
    expect(await screen.findByText('مساحة قائمة')).toBeDefined()
  })

  it('الإعدادات صفوف مرجعية بأقسامها وتقود إلى «حول»', async () => {
    render(<SidePanelApp />)
    await screen.findByText('مساحاتك')

    fireEvent.click(screen.getByRole('button', { name: 'الإعدادات' }))

    expect(await screen.findByText('المظهر واللغة')).toBeDefined()
    expect(screen.getByText('الصلاحيات')).toBeDefined()
    expect(screen.getByText('البيانات')).toBeDefined()
    expect(screen.getByText('عن جُسور')).toBeDefined()
    expect(screen.getByText('الإصدار: 1.0.0')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: /حول جُسور/ }))
    expect(await screen.findByText(/صُمّم وطُوّر بواسطة سلطان/)).toBeDefined()
  })

  it('إعادة عرض التعريف تعمل من الإعدادات دون مساس بعلامة أول تشغيل', async () => {
    render(<SidePanelApp />)
    await screen.findByText('مساحاتك')

    fireEvent.click(screen.getByRole('button', { name: 'الإعدادات' }))
    fireEvent.click(await screen.findByRole('button', { name: /شرح جُسور/ }))

    expect(await screen.findByText('احفظ سياق العمل، لا التبويبات فقط.')).toBeDefined()
    expect(markFirstRunSeen).not.toHaveBeenCalled()
  })
})

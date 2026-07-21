import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AboutScreen } from '../../src/ui/AboutScreen'
import { checkForUpdates } from '../../src/app/about'
import { createTranslator } from '../../src/i18n/messages'
import {
  CHANGELOG_URL,
  DEVELOPER_GITHUB_URL,
  NEW_ISSUE_URL,
  RELEASES_URL,
  REPOSITORY_URL,
} from '../../src/core/project-links'

vi.mock('../../src/app/about', () => ({ checkForUpdates: vi.fn() }))

/**
 * صفحة «حول»: هوية جُسور أعلى حضورًا، الإصدار من مصدره الفعلي، روابط
 * المشروع من الإعداد المركزي وحده، التحديثات صادقة تقنيًا، وحقوق المطور
 * توقيع ثانوي بلا زر ولا هوية موازية.
 */

const ar = createTranslator('ar')
const en = createTranslator('en')

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderAbout(overrides: Partial<Parameters<typeof AboutScreen>[0]> = {}) {
  return render(
    <AboutScreen language="ar" onBack={vi.fn()} t={ar} version="1.0.0" {...overrides} />,
  )
}

describe('هوية جُسور في أعلى الشاشة', () => {
  it('تبدأ بعلامة جُسور واسمه ووصفه والإصدار الحقيقي', () => {
    const { container } = renderAbout()

    expect(container.querySelector('.jusoor-mark')).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'جُسور' })).toBeDefined()
    expect(
      screen.getByText(
        'إضافة متصفح تحفظ سياق عملك لا تبويباتك وحدها، وتعيدك إلى نقطة توقفك وخطوتك التالية.',
      ),
    ).toBeDefined()
    expect(screen.getByText('الإصدار: 1.0.0')).toBeDefined()
  })

  it('غياب الإصدار يخفي سطره وزر التحقق من التحديثات معًا', () => {
    renderAbout({ version: undefined })
    expect(screen.queryByText(/الإصدار/)).toBeNull()
    expect(screen.queryByText('التحقق من وجود تحديثات')).toBeNull()
  })
})

describe('التحديثات والروابط', () => {
  it('قسم التحديثات صادق: المتجر يحدّث تلقائيًا، وجُسور لا يتصل بالشبكة مباشرة', () => {
    renderAbout()
    expect(screen.getByText(/يحدّث المتصفح الإضافة تلقائيًا/)).toBeDefined()
    expect(screen.queryByText(/آخر فحص/)).toBeNull()
  })

  it('الروابط كلها من الإعداد المركزي وتفتح في تبويب جديد', () => {
    renderAbout()

    const links = [...document.querySelectorAll('a.settings-link, a.j-credit-link')]
    const hrefs = links.map((link) => link.getAttribute('href'))

    expect(hrefs).toContain(REPOSITORY_URL)
    expect(hrefs).toContain(RELEASES_URL)
    expect(hrefs).toContain(CHANGELOG_URL)
    expect(hrefs).toContain(NEW_ISSUE_URL)
    expect(hrefs).toContain(DEVELOPER_GITHUB_URL)

    for (const link of links) {
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toContain('noreferrer')
    }
  })

  it('الإبلاغ عن مشكلة يقود إلى issues/new', () => {
    renderAbout()
    expect(NEW_ISSUE_URL.endsWith('/issues/new')).toBe(true)
  })
})

describe('زر التحقق من وجود تحديثات', () => {
  it('لا تحديث: يعرض «أنت تستخدم أحدث إصدار»', async () => {
    vi.mocked(checkForUpdates).mockResolvedValue({ status: 'no_update' })
    renderAbout()

    fireEvent.click(screen.getByText('التحقق من وجود تحديثات'))
    expect(checkForUpdates).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      expect(screen.getByText('أنت تستخدم أحدث إصدار.')).toBeDefined()
    })
  })

  it('تحديث متاح: يعرض رقم الإصدار الجديد ولا يدّعي تثبيتًا ذاتيًا', async () => {
    vi.mocked(checkForUpdates).mockResolvedValue({ status: 'update_available', version: '1.1.0' })
    renderAbout()

    fireEvent.click(screen.getByText('التحقق من وجود تحديثات'))

    await waitFor(() => {
      expect(screen.getByText(/1\.1\.0/)).toBeDefined()
    })
  })

  it('throttled لا يُدمَج مع لا تحديث — رسالة منفصلة صادقة', async () => {
    vi.mocked(checkForUpdates).mockResolvedValue({ status: 'throttled' })
    renderAbout()

    fireEvent.click(screen.getByText('التحقق من وجود تحديثات'))

    await waitFor(() => {
      expect(screen.getByText('تعذّر التحقق الآن. حاول مرة أخرى بعد قليل.')).toBeDefined()
    })
    expect(screen.queryByText('أنت تستخدم أحدث إصدار.')).toBeNull()
  })

  it('لا يستدعي فحصًا آليًا قبل النقر', () => {
    renderAbout()
    expect(checkForUpdates).not.toHaveBeenCalled()
  })
})

describe('حقوق المطور', () => {
  it('توقيع ثانوي: علامة مصغرة وصيغة كاملة وحقوق ورابط — بلا زر', () => {
    const { container } = renderAbout()

    expect(container.querySelector('.j-credit-mark')).not.toBeNull()
    expect(screen.getByText('صُمّم وطُوّر بواسطة سلطان')).toBeDefined()
    expect(screen.getByText('© 2026 سلطان — جميع الحقوق محفوظة')).toBeDefined()
    expect(container.querySelector('.j-credit button')).toBeNull()
  })
})

describe('الإنجليزية والعودة', () => {
  it('تعرض الشاشة كاملة بالإنجليزية', () => {
    render(<AboutScreen language="en" onBack={vi.fn()} t={en} version="1.0.0" />)

    expect(screen.getByRole('heading', { name: 'Jusoor' })).toBeDefined()
    expect(screen.getByText('Version: 1.0.0')).toBeDefined()
    expect(screen.getByText('Sultan — Design & Development')).toBeDefined()
  })

  it('العودة في الرأس تستدعي onBack', () => {
    const onBack = vi.fn()
    render(<AboutScreen language="ar" onBack={onBack} t={ar} version="1.0.0" />)

    const header = document.querySelector('.panel-header')
    fireEvent.click(header!.querySelector('button[aria-label="رجوع"]') as HTMLElement)
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})

import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PAGE_PROGRESS_STATUS,
  DEFAULT_TAB_OPENING_STATUS,
  DEFAULT_WORKSPACE_STATUS,
  DEFAULT_WORKSPACE_TEMPLATE,
  PAGE_PROGRESS_STATUSES,
  PAGE_ROLES,
  RESTORE_STATUSES,
  TAB_OPENING_STATUSES,
  WORKSPACE_STATUSES,
  WORKSPACE_TEMPLATES,
  isPageProgressStatus,
  isPageRole,
  isRestoreStatus,
  isTabOpeningStatus,
  isWorkspaceStatus,
  isWorkspaceTemplate,
} from '../../src/core/enums'

/**
 * ثبات المفردات — أي تغيير هنا يكسر التوافق مع بيانات مخزَّنة سابقًا،
 * فهذه الاختبارات تحمي المفردات المعتمدة من التوسّع أو الانحراف الصامت.
 */

describe('WorkspaceTemplate', () => {
  it('القيم الثلاث المعتمدة بالترتيب — دستور المنتج §7.1', () => {
    expect(WORKSPACE_TEMPLATES).toEqual(['general', 'research', 'development'])
  })

  it('الافتراضي general، ولا يُجبر المستخدم على اختيار قالب', () => {
    expect(DEFAULT_WORKSPACE_TEMPLATE).toBe('general')
  })

  it('يرفض القيم غير المعروفة', () => {
    expect(isWorkspaceTemplate('general')).toBe(true)
    expect(isWorkspaceTemplate('personal')).toBe(false)
    expect(isWorkspaceTemplate(42)).toBe(false)
  })
})

describe('WorkspaceStatus', () => {
  it('نشطة، مجمدة، مؤرشفة — دستور المنتج §7.1', () => {
    expect(WORKSPACE_STATUSES).toEqual(['active', 'frozen', 'archived'])
  })

  it('الافتراضي active', () => {
    expect(DEFAULT_WORKSPACE_STATUS).toBe('active')
  })

  it('يرفض القيم غير المعروفة', () => {
    expect(isWorkspaceStatus('frozen')).toBe(true)
    expect(isWorkspaceStatus('deleted')).toBe(false)
  })
})

describe('PageProgressStatus', () => {
  it('لم تبدأ، قيد العمل، متوقفة مؤقتًا، مكتملة — دستور المنتج §7.3 وهوية §10.3', () => {
    expect(PAGE_PROGRESS_STATUSES).toEqual([
      'not-started',
      'in-progress',
      'paused',
      'complete',
    ])
  })

  it('الافتراضي not-started — حقيقة واقعية عن صفحة أُضيفت للتو، لا حكم', () => {
    expect(DEFAULT_PAGE_PROGRESS_STATUS).toBe('not-started')
  })

  it('يرفض القيم غير المعروفة', () => {
    expect(isPageProgressStatus('paused')).toBe(true)
    expect(isPageProgressStatus('unknown')).toBe(false)
  })
})

describe('PageRole', () => {
  it('أساسية، داعمة، تحتاج تحقق، مستبعدة — دستور المنتج §7.3 وهوية §10.3', () => {
    expect(PAGE_ROLES).toEqual(['primary', 'supporting', 'verify', 'excluded'])
  })

  it('يرفض القيم غير المعروفة', () => {
    expect(isPageRole('primary')).toBe(true)
    expect(isPageRole('secondary')).toBe(false)
  })
})

describe('TabOpeningStatus — حالة جلسة مؤقتة، مستقلة عن RestoreStatus', () => {
  it('أربع قيم بالضبط، ولا تتقاطع تسميتها مع RestoreStatus', () => {
    expect(TAB_OPENING_STATUSES).toEqual([
      'not-attempted',
      'opening',
      'opened',
      'unavailable',
    ])
  })

  it('الافتراضي not-attempted', () => {
    expect(DEFAULT_TAB_OPENING_STATUS).toBe('not-attempted')
  })

  it('يرفض القيم غير المعروفة', () => {
    expect(isTabOpeningStatus('opened')).toBe(true)
    expect(isTabOpeningStatus('restored')).toBe(false)
  })

  it("'opened' هنا ليست 'restored' — الفصل موثق في docs/decisions/0009-data-model.md", () => {
    expect((RESTORE_STATUSES as readonly string[]).includes('opened')).toBe(false)
    expect((TAB_OPENING_STATUSES as readonly string[]).includes('restored')).toBe(false)
  })
})

describe('RestoreStatus — نظام الاستعادة الصادق الثماني، دستور الهوية §10.4', () => {
  it('الحالات الثماني بالضبط وبالترتيب المعتمد', () => {
    expect(RESTORE_STATUSES).toEqual([
      'not-opened',
      'restoring',
      'restored',
      'restored-approximately',
      'position-not-found',
      'unavailable',
      'permission-required',
      'login-required',
    ])
    expect(RESTORE_STATUSES.length).toBe(8)
  })

  it('يرفض القيم غير المعروفة', () => {
    expect(isRestoreStatus('restored-approximately')).toBe(true)
    expect(isRestoreStatus('opened')).toBe(false)
  })
})

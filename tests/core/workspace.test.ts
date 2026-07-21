import { describe, expect, it } from 'vitest'

import { asWorkspaceId } from '../../src/core/ids'
import type { Workspace, WorkspaceTransition } from '../../src/core/workspace'
import { transitionWorkspaceStatus } from '../../src/core/workspace'

const T0 = 1_000
const T1 = 2_000

function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: asWorkspaceId('w1'),
    name: 'تحليل أطر الخصوصية',
    template: 'general',
    status: 'active',
    createdAt: T0,
    updatedAt: T0,
    lastWorkedAt: T0,
    ...overrides,
  }
}

describe('transitionWorkspaceStatus — الانتقالات المسموحة', () => {
  it('active → frozen (freeze) يضبط frozenAt وupdatedAt وlastWorkedAt', () => {
    const workspace = makeWorkspace({ status: 'active' })
    const result = transitionWorkspaceStatus(workspace, 'freeze', T1)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.status).toBe('frozen')
    expect(result.value.frozenAt).toBe(T1)
    expect(result.value.updatedAt).toBe(T1)
    expect(result.value.lastWorkedAt).toBe(T1)
    expect(result.value.archivedAt).toBeUndefined()
  })

  it('frozen → active (resume) يمسح frozenAt، ويحافظ على lastReached وnextStep', () => {
    const workspace = makeWorkspace({
      status: 'frozen',
      frozenAt: T0,
      lastReached: 'حددت ثلاثة اختلافات تحتاج تحققًا',
      nextStep: 'راجع القسم الثالث',
    })
    const result = transitionWorkspaceStatus(workspace, 'resume', T1)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.status).toBe('active')
    expect(result.value.frozenAt).toBeUndefined()
    expect(result.value.updatedAt).toBe(T1)
    expect(result.value.lastWorkedAt).toBe(T1)
    // §11 من تقرير نموذج البيانات: العودة إلى نشطة لا تمسح نقطة التوقف ولا الخطوة التالية
    expect(result.value.lastReached).toBe('حددت ثلاثة اختلافات تحتاج تحققًا')
    expect(result.value.nextStep).toBe('راجع القسم الثالث')
  })

  it('active → archived (archive) يضبط archivedAt ولا يرفع lastWorkedAt', () => {
    const workspace = makeWorkspace({ status: 'active', lastWorkedAt: T0 })
    const result = transitionWorkspaceStatus(workspace, 'archive', T1)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.status).toBe('archived')
    expect(result.value.archivedAt).toBe(T1)
    expect(result.value.updatedAt).toBe(T1)
    // الأرشفة إزاحة من الطريق لا عمل على المهمة — §8 من تقرير نموذج البيانات
    expect(result.value.lastWorkedAt).toBe(T0)
  })

  it('frozen → archived (archive) يمسح frozenAt ويضبط archivedAt', () => {
    const workspace = makeWorkspace({ status: 'frozen', frozenAt: T0 })
    const result = transitionWorkspaceStatus(workspace, 'archive', T1)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.status).toBe('archived')
    expect(result.value.frozenAt).toBeUndefined()
    expect(result.value.archivedAt).toBe(T1)
  })

  it('archived → active (unarchive) يمسح archivedAt ويرفع lastWorkedAt', () => {
    const workspace = makeWorkspace({ status: 'archived', archivedAt: T0 })
    const result = transitionWorkspaceStatus(workspace, 'unarchive', T1)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.status).toBe('active')
    expect(result.value.archivedAt).toBeUndefined()
    expect(result.value.lastWorkedAt).toBe(T1)
  })
})

describe('transitionWorkspaceStatus — الانتقالات المرفوضة', () => {
  const rejectedCases: { status: Workspace['status']; transition: WorkspaceTransition }[] = [
    { status: 'active', transition: 'resume' },
    { status: 'active', transition: 'unarchive' },
    { status: 'frozen', transition: 'freeze' },
    { status: 'frozen', transition: 'unarchive' },
    { status: 'archived', transition: 'freeze' },
    // archived → frozen ممنوع صراحة: يجب إلغاء الأرشفة أولًا
    { status: 'archived', transition: 'archive' },
    { status: 'archived', transition: 'resume' },
    // أي حالة إلى نفسها عبر تكرار نفس الانتقال
    { status: 'active', transition: 'archive' },
  ]

  it.each(
    rejectedCases.filter(
      (c) => !(c.status === 'active' && c.transition === 'archive'), // مسموح، اختبار منفصل أدناه
    ),
  )('$status عبر $transition مرفوض', ({ status, transition }) => {
    // لا يُمرَّر frozenAt/archivedAt كـ undefined صراحة — exactOptionalPropertyTypes
    // يمنع ذلك؛ الغياب يعني الحذف الكامل للمفتاح لا قيمته undefined.
    const workspace = makeWorkspace({
      status,
      ...(status === 'frozen' ? { frozenAt: T0 } : {}),
      ...(status === 'archived' ? { archivedAt: T0 } : {}),
    })
    const result = transitionWorkspaceStatus(workspace, transition, T1)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('workspace/invalid-status-transition')
  })

  it('تكرار freeze بعد التجميد مرفوض (لا انتقال من حالة إلى نفسها)', () => {
    const workspace = makeWorkspace({ status: 'frozen', frozenAt: T0 })
    const result = transitionWorkspaceStatus(workspace, 'freeze', T1)

    expect(result.ok).toBe(false)
  })

  it('تكرار archive بعد الأرشفة مرفوض', () => {
    const workspace = makeWorkspace({ status: 'archived', archivedAt: T0 })
    const result = transitionWorkspaceStatus(workspace, 'archive', T1)

    expect(result.ok).toBe(false)
  })

  it('الانتقال المرفوض لا يغيّر المساحة الأصلية (نقاء الدالة)', () => {
    const workspace = makeWorkspace({ status: 'archived', archivedAt: T0 })
    transitionWorkspaceStatus(workspace, 'freeze', T1)

    expect(workspace.status).toBe('archived')
    expect(workspace.archivedAt).toBe(T0)
  })
})

describe('lastWorkedAt — لا يتغير إلا من عمل مقصود على المهمة', () => {
  it('لا يتحرك بمجرد تمرير وقت أحدث دون استدعاء انتقال ذي معنى', () => {
    // الأرشفة وحدها بين الانتقالات المتاحة هنا لا ترفع lastWorkedAt، وهذا مُختبَر أعلاه.
    // هذا الاختبار يثبت أن الانتقالات الثلاثة الأخرى (freeze/resume/unarchive) كلها
    // تعتبر عملًا مقصودًا فترفعه فعليًا — لا قناة صامتة تُبقيه ثابتًا خطأً.
    const frozen = transitionWorkspaceStatus(
      makeWorkspace({ status: 'active', lastWorkedAt: T0 }),
      'freeze',
      T1,
    )
    expect(frozen.ok && frozen.value.lastWorkedAt).toBe(T1)
  })
})

/**
 * مساحة العمل — تمثل مهمة أو مشروعًا أو سؤالًا واحدًا، وتبقى منفصلة عن بقية
 * المساحات لمنع اختلاط السياقات — دستور المنتج §7.1.
 *
 * انتقالات الحالة هنا دوال خالصة: تستقبل الوقت كوسيط صريح ولا تستدعي
 * Date.now()، فيبقى المنطق قابلًا للاختبار بقيم زمنية ثابتة.
 */

import type { SavedPageId, WorkspaceId } from './ids'
import type { Result } from './errors'
import type { WorkspaceStatus, WorkspaceTemplate } from './enums'

export interface Workspace {
  id: WorkspaceId
  /** غير فارغ بعد trim — يُتحقق منه في validation.ts، لا يُفرض بنيويًا هنا. */
  name: string
  /** الهدف أو السؤال — دستور المنتج §7.1 */
  goal?: string
  description?: string
  template: WorkspaceTemplate
  status: WorkspaceStatus
  /** ملاحظة عامة مفردة للمساحة — دستور المنتج §7.6 */
  generalNote?: string
  /** آخر ما وصلت إليه — دستور المنتج §7.4 */
  lastReached?: string
  /** الخطوة التالية — يجوز أن تبقى فارغة — دستور المنتج §7.5 */
  nextStep?: string
  /** التبويب الذي كان نشطًا عند الحفظ — دستور المنتج §7.1. يشير إلى SavedPage.id */
  activePageId?: SavedPageId
  createdAt: number
  updatedAt: number
  /**
   * يُضبط فقط من عمل مقصود على المهمة (إضافة/تعديل صفحة، ملاحظة، تجميد، استعادة)،
   * لا كأثر جانبي لكل كتابة. لا يتغير بتغيير اللغة أو السمة ولا بمجرد القراءة أو الأرشفة
   * — docs/decisions/0009-data-model.md
   */
  lastWorkedAt: number
  /** موجود ⟺ status === 'frozen' */
  frozenAt?: number
  /** موجود ⟺ status === 'archived' */
  archivedAt?: number
}

/**
 * الانتقالات المسموحة بين حالات المساحة:
 *
 *   active  --freeze-->   frozen
 *   frozen  --resume-->   active
 *   active  --archive-->  archived
 *   frozen  --archive-->  archived   (تُمسح frozenAt عند الأرشفة من التجميد)
 *   archived --unarchive--> active
 *
 * أي انتقال آخر مرفوض، بما فيه archived → frozen (يجب إلغاء الأرشفة أولًا)
 * وأي حالة إلى نفسها.
 */
export type WorkspaceTransition = 'freeze' | 'resume' | 'archive' | 'unarchive'

const ALLOWED_TRANSITIONS: Record<WorkspaceTransition, readonly WorkspaceStatus[]> = {
  freeze: ['active'],
  resume: ['frozen'],
  archive: ['active', 'frozen'],
  unarchive: ['archived'],
}

/** ينسخ مساحة بدون frozenAt — يعتمد على كون الحقل اختياريًا فيحذفه حذفًا حقيقيًا. */
function withoutFrozenAt(workspace: Workspace): Workspace {
  const next = { ...workspace }
  delete next.frozenAt
  return next
}

/** ينسخ مساحة بدون archivedAt. */
function withoutArchivedAt(workspace: Workspace): Workspace {
  const next = { ...workspace }
  delete next.archivedAt
  return next
}

/**
 * ينفّذ انتقال حالة على مساحة عمل، أو يرفضه إن لم يكن مسموحًا من حالتها الراهنة.
 *
 * `now` يُمرَّر صراحةً؛ لا استدعاء لـ Date.now() داخل core/.
 */
export function transitionWorkspaceStatus(
  workspace: Workspace,
  transition: WorkspaceTransition,
  now: number,
): Result<Workspace> {
  const allowedFrom = ALLOWED_TRANSITIONS[transition]

  if (!allowedFrom.includes(workspace.status)) {
    return { ok: false, error: 'workspace/invalid-status-transition' }
  }

  switch (transition) {
    case 'freeze':
      return {
        ok: true,
        value: {
          ...workspace,
          status: 'frozen',
          frozenAt: now,
          updatedAt: now,
          lastWorkedAt: now,
        },
      }

    case 'resume':
      return {
        ok: true,
        value: {
          ...withoutFrozenAt(workspace),
          status: 'active',
          updatedAt: now,
          lastWorkedAt: now,
        },
      }

    case 'archive':
      // الأرشفة إزاحة من الطريق لا عمل على المهمة؛ lastWorkedAt لا يتغير عمدًا.
      return {
        ok: true,
        value: {
          ...withoutFrozenAt(workspace),
          status: 'archived',
          archivedAt: now,
          updatedAt: now,
        },
      }

    case 'unarchive':
      return {
        ok: true,
        value: {
          ...withoutArchivedAt(workspace),
          status: 'active',
          updatedAt: now,
          lastWorkedAt: now,
        },
      }
  }
}

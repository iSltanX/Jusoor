/**
 * طبقة التركيب لمسار «إنشاء مساحة من تبويبات النافذة» وحده.
 *
 * العمل داخل المساحات (الدليل، الفتح، التحرير، الصفحات، الملاحظات) في
 * `workspace-session.ts`. الفصل بحسب المسار لا بحسب الطبقة: هذا الملف يخص
 * التقاط التبويبات وما يليه مباشرة.
 *
 * كل عطل تشغيلي (تعذر فتح القاعدة، إجهاض معاملة) يُلتقط هنا ويتحول إلى
 * `UseCaseResult` منظم، فلا يصل استثناء خام إلى طبقة العرض.
 */

import type { UseCaseResult } from './errors'
import { randomIdGenerator, systemClock, toUnexpected, withDatabase } from './runtime'
import {
  createWorkspaceFromTabs,
  previewWindowTabs,
  type CreateWorkspaceFromTabsInput,
  type CreateWorkspaceFromTabsOutcome,
  type WindowTabsPreview,
} from './window-tabs'
import { hasTabsPermission } from './permissions'
import { readCurrentWindowTabs } from '../browser/tabs'



// ===== تبويبات النافذة =====

/**
 * يقرأ تبويبات النافذة الحالية للاختيار. **لا يطلب صلاحية `tabs`**؛ يفحصها فقط
 * ويعيد `needsPermission` عند غيابها — الطلب فعل مستقل صريح (`app/permissions.ts`).
 */
export async function loadWindowTabs(): Promise<UseCaseResult<WindowTabsPreview>> {
  try {
    return await previewWindowTabs(hasTabsPermission, readCurrentWindowTabs)
  } catch (error: unknown) {
    return { ok: false, error: toUnexpected(error) }
  }
}

// ===== إنشاء المساحة =====

export async function createWorkspaceFromSelectedTabs(
  input: CreateWorkspaceFromTabsInput,
): Promise<UseCaseResult<CreateWorkspaceFromTabsOutcome>> {
  return withDatabase((db) =>
    createWorkspaceFromTabs(db, systemClock, randomIdGenerator, input),
  )
}

export type { CreateWorkspaceFromTabsOutcome, WindowTabsPreview }

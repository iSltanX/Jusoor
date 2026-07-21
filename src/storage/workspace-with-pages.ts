/**
 * كتابة مركّبة ذرية لمساحة عمل مع صفحاتها معًا — مخزنا workspaces وsavedPages
 * في معاملة IndexedDB واحدة.
 *
 * لإنشاء مساحة من تبويبات مختارة (app/) بدل كتابتين منفصلتين: نجاح الأولى
 * وفشل الثانية كان سيترك إما مساحة فارغة لا تشير إليها صفحاتها المفترضة، أو
 * صفحات تشير إلى مساحة لم تُكتب فعليًا. لا رولباك يدوي: كل مساحة وصفحة تُتحقق
 * قبل فتح أي معاملة، فإن فشل تحقق واحد لم تُفتح معاملة أصلًا.
 *
 * والتحقق هنا لا يقتصر على صحة كل سجل منفردًا: الدفعة نفسها لها علاقات داخلية
 * لا يكتشفها فحص السجلات واحدًا واحدًا — انظر `validateBatchRelations` أدناه.
 */

import { SAVED_PAGES_STORE, WORKSPACES_STORE } from './database'
import { transactionDone } from './idb'
import type { StorageResult } from './errors'
import type { Workspace } from '../core/workspace'
import type { SavedPage } from '../core/page'
import {
  arePagesWithinWorkspace,
  hasUniqueSavedPageIds,
  isActivePageWithinWorkspace,
} from '../core/validation'
import { toWorkspaceRecord, validateWorkspaceForWrite } from './workspaces'
import { toSavedPageRecord, validatePageForWrite } from './pages'

/**
 * يتحقق من العلاقات الداخلية للدفعة — ثلاث علاقات لا يكتشفها فحص أي سجل وحده:
 *
 * 1. **انتماء الصفحات**: صفحة بـ`workspaceId` مختلف صفحة صحيحة بنيويًا، لكنها
 *    ستظهر في مساحة أخرى تمامًا.
 * 2. **تفرّد المعرفات**: معرّفان متطابقان داخل الدفعة يجعلان `put` الثانية
 *    تستبدل الأولى **صامتًا**، فيختفي أحد اختيارات المستخدم بلا أثر.
 * 3. **مرجع التبويب النشط**: `activePageId` يشير إلى صفحة غير مكتوبة معه يترك
 *    مساحة تشير إلى سجل غير موجود.
 *
 * القواعد الثلاث دوال خالصة في `core/validation.ts` — لا طبقة تحقق موازية هنا.
 */
function validateBatchRelations(
  workspace: Workspace,
  pages: readonly SavedPage[],
): StorageResult<void> {
  if (!arePagesWithinWorkspace(workspace.id, pages)) {
    return { ok: false, error: 'storage/invalid-write', details: 'page workspaceId mismatch' }
  }
  if (!hasUniqueSavedPageIds(pages)) {
    return { ok: false, error: 'storage/invalid-write', details: 'duplicate page id in batch' }
  }
  if (!isActivePageWithinWorkspace(workspace, pages)) {
    return { ok: false, error: 'storage/invalid-write', details: 'activePageId not in batch' }
  }
  return { ok: true, value: undefined }
}

/**
 * يحفظ مساحة عمل وصفحاتها معًا ذرّيًا — إما تُكتب كلتاهما معًا أو لا شيء.
 * لا تكشف IDBTransaction لمستدعيها؛ تعيد StorageResult<void> فقط كبقية دوال
 * هذه الطبقة.
 */
export async function writeWorkspaceWithPages(
  db: IDBDatabase,
  workspace: Workspace,
  pages: readonly SavedPage[],
): Promise<StorageResult<void>> {
  const workspaceValidation = validateWorkspaceForWrite(workspace)
  if (!workspaceValidation.ok) return workspaceValidation

  for (const page of pages) {
    const pageValidation = validatePageForWrite(page)
    if (!pageValidation.ok) return pageValidation
  }

  const relations = validateBatchRelations(workspace, pages)
  if (!relations.ok) return relations

  const transaction = db.transaction([WORKSPACES_STORE, SAVED_PAGES_STORE], 'readwrite')

  transaction.objectStore(WORKSPACES_STORE).put(toWorkspaceRecord(workspace))

  const pagesStore = transaction.objectStore(SAVED_PAGES_STORE)
  for (const page of pages) {
    pagesStore.put(toSavedPageRecord(page))
  }

  await transactionDone(transaction)

  return { ok: true, value: undefined }
}

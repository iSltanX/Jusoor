/**
 * عقد النقل: مخطط JSON المعلَن للتصدير والاستيراد — دستور المنتج §9.9 و§9.10.
 *
 * موضعه `storage/` لا `core/`: التحقق الصارم يعيد استخدام `parseWorkspaceRecord`
 * و`parseSavedPageRecord` القائمتين، وهما هنا. إنشاء نسخة ثانية منهما في `core`
 * كان سيُنتج طبقتَي تحقق تتباعدان بمرور الوقت — وهو أخطر ما يمكن أن يحدث لأخطر
 * مدخل في المنتج. و`core` لا يستورد `storage` (قرار 0005)، فالاتجاه محسوم.
 *
 * **JSON وحده عقد النقل.** النص العادي وMarkdown مخرجا قراءة ومشاركة (§9.9)،
 * ولا يُدَّعى أنهما قابلان لإعادة الاستيراد — لأن الاختصار فيهما يحذف أنواع
 * بيانات عمدًا (§9.6)، فملف ناقص بطبيعته ليس نسخة احتياطية.
 *
 * **لا ثقة تلقائية بأي ملف** (§9.10): كل سجل يمر بالمحلّل نفسه الذي يحرس القراءة
 * من IndexedDB، وأي فشل يرفض **الملف كله** بسبب منظَّم — لا استيراد جزئي يترك
 * المستخدم لا يدري ما دخل وما سقط.
 */

import {
  SAVED_PAGES_BY_WORKSPACE_INDEX,
  SAVED_PAGES_STORE,
  WORKSPACES_STORE,
} from './database'
import { requestToPromise, transactionDone } from './idb'
import type { StorageErrorCode, StorageResult } from './errors'
import { parseSavedPageRecord, toSavedPageRecord, validatePageForWrite } from './pages'
import {
  parseWorkspaceRecord,
  toWorkspaceRecord,
  validateWorkspaceForWrite,
} from './workspaces'
import type { SavedPage } from '../core/page'
import type { Workspace } from '../core/workspace'
import {
  arePagesWithinWorkspace,
  hasUniqueSavedPageIds,
  isActivePageWithinWorkspace,
} from '../core/validation'

// ===== المخطط المعلَن =====

/** معرّف الصيغة — يميّز ملف جُسور عن أي JSON آخر قبل قراءة محتواه. */
export const TRANSFER_FORMAT = 'jusoor.workspaces'

/**
 * إصدار المخطط. يُرفع فقط عند تغيير غير متوافق، ويُقرأ عند الاستيراد لرفض
 * ملف من إصدار لا يعرفه هذا البناء بدل تأويله تخمينًا.
 */
export const TRANSFER_VERSION = 1

/** مساحة مع صفحاتها كما تظهر في الملف — الصفحات مضمَّنة لا مسطّحة بمفاتيح أجنبية. */
export interface TransferWorkspace {
  workspace: Workspace
  pages: SavedPage[]
}

export interface TransferEnvelope {
  format: typeof TRANSFER_FORMAT
  version: number
  exportedAt: number
  workspaces: TransferWorkspace[]
}

// ===== التصدير =====

/**
 * يبني نص JSON للتصدير.
 *
 * مسافات بادئة مقصودة: الملف يُفتح بعين بشرية ويُراجع قبل مشاركته (§11.2)،
 * وسطرٌ واحد طويل يمنع ذلك. الحجم ليس قيدًا لملف محلي.
 */
export function serializeTransfer(
  workspaces: readonly TransferWorkspace[],
  exportedAt: number,
): string {
  const envelope: TransferEnvelope = {
    format: TRANSFER_FORMAT,
    version: TRANSFER_VERSION,
    exportedAt,
    workspaces: workspaces.map(({ workspace, pages }) => ({
      workspace: toWorkspaceRecord(workspace),
      pages: pages.map(toSavedPageRecord),
    })),
  }

  return JSON.stringify(envelope, null, 2)
}

// ===== أسباب الرفض =====

/**
 * سبب منظَّم لرفض ملف — يُترجم في الواجهة ويُختبر بالرمز.
 *
 * يذكر **موضع** الخلل (أي مساحة، وأي صفحة) لا محتواه: رسالة خطأ تعيد عرض قيمة
 * من ملف غير موثوق تنقل مشكلة الثقة إلى الشاشة بدل حلّها.
 */
export type TransferRejection =
  | { reason: 'not-json' }
  | { reason: 'not-an-object' }
  | { reason: 'unknown-format' }
  | { reason: 'unsupported-version'; found: number }
  | { reason: 'workspaces-not-a-list' }
  | { reason: 'entry-not-an-object'; workspaceIndex: number }
  | { reason: 'pages-not-a-list'; workspaceIndex: number }
  | {
      reason: 'invalid-workspace'
      workspaceIndex: number
      error: StorageErrorCode
      details?: string
    }
  | {
      reason: 'invalid-page'
      workspaceIndex: number
      pageIndex: number
      error: StorageErrorCode
      details?: string
    }
  | { reason: 'page-outside-workspace'; workspaceIndex: number; pageIndex: number }
  | { reason: 'duplicate-page-id'; workspaceIndex: number }
  | { reason: 'active-page-missing'; workspaceIndex: number }

export type TransferParseResult =
  | { ok: true; value: TransferEnvelope }
  | { ok: false; rejection: TransferRejection }

// ===== الاستيراد: التحقق =====

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * يحلّل نص ملف ويتحقق منه بالكامل قبل أن يمس التخزين شيء.
 *
 * الترتيب مقصود: الغلاف أولًا (صيغة، إصدار، قائمة)، ثم كل مساحة بمحلّلها، ثم
 * صفحاتها، ثم **العلاقات الداخلية** التي لا يكتشفها فحص سجل منفرد — انتماء
 * الصفحة لمساحتها، وتفرّد المعرفات، ومرجع التبويب النشط. هذه القواعد الثلاث
 * دوال خالصة في `core/validation.ts`، ولا تُعاد كتابتها هنا.
 */
export function parseTransfer(raw: string): TransferParseResult {
  let decoded: unknown
  try {
    decoded = JSON.parse(raw)
  } catch {
    return { ok: false, rejection: { reason: 'not-json' } }
  }

  if (!isRecord(decoded)) return { ok: false, rejection: { reason: 'not-an-object' } }

  if (decoded.format !== TRANSFER_FORMAT) {
    return { ok: false, rejection: { reason: 'unknown-format' } }
  }

  const version = decoded.version
  if (typeof version !== 'number' || version !== TRANSFER_VERSION) {
    return {
      ok: false,
      rejection: {
        reason: 'unsupported-version',
        found: typeof version === 'number' ? version : -1,
      },
    }
  }

  const rawWorkspaces = decoded.workspaces
  if (!Array.isArray(rawWorkspaces)) {
    return { ok: false, rejection: { reason: 'workspaces-not-a-list' } }
  }

  const workspaces: TransferWorkspace[] = []

  for (const [workspaceIndex, rawEntry] of rawWorkspaces.entries()) {
    if (!isRecord(rawEntry)) {
      return { ok: false, rejection: { reason: 'entry-not-an-object', workspaceIndex } }
    }

    const parsedWorkspace = parseWorkspaceRecord(rawEntry.workspace)
    if (!parsedWorkspace.ok) {
      return {
        ok: false,
        rejection: {
          reason: 'invalid-workspace',
          workspaceIndex,
          error: parsedWorkspace.error,
          ...(parsedWorkspace.details !== undefined ? { details: parsedWorkspace.details } : {}),
        },
      }
    }

    const rawPages = rawEntry.pages
    if (!Array.isArray(rawPages)) {
      return { ok: false, rejection: { reason: 'pages-not-a-list', workspaceIndex } }
    }

    const pages: SavedPage[] = []

    for (const [pageIndex, rawPage] of rawPages.entries()) {
      const parsedPage = parseSavedPageRecord(rawPage)
      if (!parsedPage.ok) {
        return {
          ok: false,
          rejection: {
            reason: 'invalid-page',
            workspaceIndex,
            pageIndex,
            error: parsedPage.error,
            ...(parsedPage.details !== undefined ? { details: parsedPage.details } : {}),
          },
        }
      }
      pages.push(parsedPage.value)
    }

    const workspace = parsedWorkspace.value

    if (!arePagesWithinWorkspace(workspace.id, pages)) {
      const pageIndex = pages.findIndex((page) => page.workspaceId !== workspace.id)
      return {
        ok: false,
        rejection: { reason: 'page-outside-workspace', workspaceIndex, pageIndex },
      }
    }

    if (!hasUniqueSavedPageIds(pages)) {
      return { ok: false, rejection: { reason: 'duplicate-page-id', workspaceIndex } }
    }

    if (!isActivePageWithinWorkspace(workspace, pages)) {
      return { ok: false, rejection: { reason: 'active-page-missing', workspaceIndex } }
    }

    workspaces.push({ workspace, pages })
  }

  return {
    ok: true,
    value: {
      format: TRANSFER_FORMAT,
      version,
      exportedAt: typeof decoded.exportedAt === 'number' ? decoded.exportedAt : 0,
      workspaces,
    },
  }
}

// ===== الاستيراد: الكتابة الذرّية =====

/**
 * ما يُكتب فعليًا بعد حسم التعارض في `app/`.
 *
 * `replaceExistingPages` تخص الاستبدال وحده: صفحات المساحة القائمة تُحذف قبل
 * كتابة الواردة، وإلا بقيت صفحات قديمة مختلطة بجديدة في مساحة يظنها المستخدم
 * مستبدَلة بالكامل.
 */
export interface ImportEntry {
  workspace: Workspace
  pages: readonly SavedPage[]
  replaceExistingPages: boolean
}

/**
 * يكتب دفعة الاستيراد كلها في **معاملة واحدة** — تنجح كاملةً أو لا شيء منها.
 *
 * ذرّية على مستوى الدفعة لا المساحة: استيراد نسخة احتياطية فيه عشر مساحات لا
 * يجوز أن ينتهي بخمس مكتوبة وخمس لا. وكل تحقق يقع **قبل** فتح المعاملة، فإن
 * رُفض سجل واحد لم تُفتح معاملة أصلًا — لا رولباك يدوي ولا كتابة تُتراجع.
 */
export async function writeImportedWorkspaces(
  db: IDBDatabase,
  entries: readonly ImportEntry[],
): Promise<StorageResult<void>> {
  for (const entry of entries) {
    const workspaceValidation = validateWorkspaceForWrite(entry.workspace)
    if (!workspaceValidation.ok) return workspaceValidation

    for (const page of entry.pages) {
      const pageValidation = validatePageForWrite(page)
      if (!pageValidation.ok) return pageValidation
    }

    if (!arePagesWithinWorkspace(entry.workspace.id, entry.pages)) {
      return { ok: false, error: 'storage/invalid-write', details: 'page workspaceId mismatch' }
    }
    if (!hasUniqueSavedPageIds(entry.pages)) {
      return { ok: false, error: 'storage/invalid-write', details: 'duplicate page id in batch' }
    }
  }

  // تفرّد المعرفات عبر الدفعة كلها، لا داخل كل مساحة وحدها.
  const workspaceIds = entries.map((entry) => entry.workspace.id)
  if (new Set(workspaceIds).size !== workspaceIds.length) {
    return { ok: false, error: 'storage/invalid-write', details: 'duplicate workspace id in batch' }
  }

  const pageIds = entries.flatMap((entry) => entry.pages.map((page) => page.id))
  if (new Set(pageIds).size !== pageIds.length) {
    return { ok: false, error: 'storage/invalid-write', details: 'duplicate page id across batch' }
  }

  const transaction = db.transaction([WORKSPACES_STORE, SAVED_PAGES_STORE], 'readwrite')
  const workspacesStore = transaction.objectStore(WORKSPACES_STORE)
  const pagesStore = transaction.objectStore(SAVED_PAGES_STORE)

  for (const entry of entries) {
    if (entry.replaceExistingPages) {
      const index = pagesStore.index(SAVED_PAGES_BY_WORKSPACE_INDEX)
      const staleKeys: IDBValidKey[] = await requestToPromise(
        index.getAllKeys(entry.workspace.id),
      )
      for (const key of staleKeys) pagesStore.delete(key)
    }

    workspacesStore.put(toWorkspaceRecord(entry.workspace))
    for (const page of entry.pages) pagesStore.put(toSavedPageRecord(page))
  }

  await transactionDone(transaction)

  return { ok: true, value: undefined }
}

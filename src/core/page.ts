/**
 * الصفحة المحفوظة — تمثل صفحةً داخل سياق مساحة بعينها، لا رابطًا عالميًا مشتركًا
 * — دستور المنتج §7.2.
 *
 * لا يوجد urlKey هنا: القيمة المطبَّعة للمقارنة تفصيل تخزين لاحق، وليست جزءًا
 * من نموذج المجال — انظر src/core/url.ts وdocs/decisions/0009-data-model.md.
 *
 * لا حقول التقاط موضع القراءة أو نتيجة الاستعادة في هذه المرحلة: لا content script
 * بعد، ولا موضع محفوظ يمكن أن تصفه نتيجة استعادة بصدق — دستور المنتج §7.2 يشترط
 * وجود موضع محفوظ لتخزين نتيجة الاستعادة، وهذا الشرط غير متحقق في النسخة الأولى.
 */

import type { PageNoteId, SavedPageId, WorkspaceId } from './ids'
import type { PageProgressStatus, PageRole } from './enums'

/**
 * ملاحظة مرتبطة بصفحة — مضمَّنة داخل SavedPage.notes، لا كيان مستقل.
 * لا تُدمج مع التظليل (Highlight): الملاحظة نص أنشأه المستخدم، والتظليل نص
 * اقتطعه من الصفحة مع موضع تقريبي — قدرة مستقلة لاحقة — دستور المنتج §7.6.
 */
export interface PageNote {
  id: PageNoteId
  /** غير فارغ بعد trim — يُتحقق منه في validation.ts. */
  body: string
  createdAt: number
  updatedAt: number
}

export interface SavedPage {
  id: SavedPageId
  /** لا صفحة بلا مساحة. */
  workspaceId: WorkspaceId
  /** الرابط الأصلي كما التُقط — لا يُعدَّل أبدًا، وهو ما يُفتح لاحقًا. */
  url: string
  /** العنوان كما التُقط؛ يبقى محفوظًا حتى لو تغيّر لاحقًا — دستور المنتج §13.1 */
  title: string
  /** مرجع أيقونة الموقع فقط — لا جلب خارجي ولا تخزين ثنائي. */
  faviconUrl?: string
  /** متى التُقط العنوان والرابط. */
  capturedAt: number
  /** ترتيب الصفحة داخل المساحة — قيمة عددية، لا معنى دلاليًا آخر. */
  order: number
  /** سبب الفتح — نص حر — دستور المنتج §7.2 */
  reason?: string
  /** حاضرة دائمًا؛ الافتراضي 'not-started' — انظر core/enums.ts */
  progressStatus: PageProgressStatus
  /** بلا افتراضي عمدًا — تصنيف الصفحة حكم المستخدم لا جُسور، دستور المنتج §16 */
  role?: PageRole
  /** الوسم الاختياري — دستور المنتج §7.3 */
  labels?: string[]
  /** مضمَّنة — دستور المنتج §7.6 */
  notes: PageNote[]
  addedAt: number
  updatedAt: number
}

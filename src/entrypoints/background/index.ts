/**
 * عامل الخدمة.
 *
 * دوره الوحيد: جعل نقر أيقونة الإضافة يفتح اللوحة الجانبية مباشرة —
 * `openPanelOnActionClick` هو السلوك الأصلي المدعوم في Chrome وEdge، ولا
 * نافذة وسيطة بعده (تعديل مؤرخ في docs/decisions/0003-extension-surfaces.md).
 *
 * يُعاد ضبط السلوك عند كل تشغيل لعامل الخدمة لأن العامل ينتهي عند الخمول ولا
 * حالة موثوقة في ذاكرته، والضبط idempotent. لا مراقبة تبويبات ولا نوافذ، ولا
 * منطق منتج هنا — `chrome.*` تبقى محصورة في src/browser/ بلا استثناء.
 */

import { enableOpenPanelOnActionClick } from '../../browser/side-panel'

export default defineBackground(() => {
  void enableOpenPanelOnActionClick()
})

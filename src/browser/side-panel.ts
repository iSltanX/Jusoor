/**
 * اللوحة الجانبية.
 *
 * سلوك الفتح المعتمد بعد مرحلة التكامل التنفيذي للهوية: نقر أيقونة الإضافة
 * يفتح اللوحة مباشرة عبر `openPanelOnActionClick` — السلوك الأصلي الذي توفره
 * منصة Chromium — بلا نافذة وسيطة. القرار موثق بتعديل مؤرخ في
 * docs/decisions/0003-extension-surfaces.md.
 */

/**
 * يجعل نقر أيقونة الإضافة يفتح اللوحة الجانبية مباشرة.
 *
 * يُستدعى من عامل الخدمة عند كل تشغيل: الإعداد يسكن جلسة المتصفح، وإعادة
 * ضبطه عملية idempotent لا أثر جانبيًا لتكرارها.
 */
export async function enableOpenPanelOnActionClick(): Promise<void> {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
}

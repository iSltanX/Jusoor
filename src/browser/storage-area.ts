/**
 * وصول خام إلى مساحة التخزين المحلية للإضافة.
 *
 * هذا الملف — مع بقية ملفات src/browser — هو المكان الوحيد المسموح فيه بظهور `chrome.*`.
 * حصر واجهات المتصفح هنا هو ما يبقي دعم Firefox ممكنًا لاحقًا دون المساس بـ core/ و storage/ و ui/.
 * انظر docs/decisions/0005-dependency-direction.md
 */

/** يقرأ قيمة مفتاح واحد من `chrome.storage.local`. */
export async function readLocal(key: string): Promise<unknown> {
  const result = await chrome.storage.local.get(key)
  return result[key]
}

/** يكتب قيمة مفتاح واحد في `chrome.storage.local`. */
export async function writeLocal(key: string, value: unknown): Promise<void> {
  await chrome.storage.local.set({ [key]: value })
}

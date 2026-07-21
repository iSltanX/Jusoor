/**
 * وصف محايد لتبويب متصفح — قيمة عابرة لا كيان محفوظ، ولا تعرف Chrome أو أي
 * واجهة متصفح. src/browser/tabs.ts يحوّل إليها كل chrome.tabs.Tab قبل مغادرة
 * تلك الطبقة، فلا يصل نوع Chrome الخام إلى app/ أو أي طبقة أخرى —
 * docs/decisions/0005-dependency-direction.md.
 *
 * الحد الأدنى الذي تحتاجه مرحلة التقاط التبويبات فقط: title وurl وindex
 * وactive. لا favIconUrl ولا sessionId ولا groupId ولا أي خاصية Chrome أخرى
 * لمجرد توفرها — docs/decisions/0011-tab-capture.md.
 */
export interface BrowserTabSnapshot {
  title: string
  url: string
  /** ترتيب التبويب داخل نافذته وقت القراءة. */
  index: number
  /** هل كان هذا التبويب هو النشط في نافذته وقت القراءة. */
  active: boolean
  /**
   * معلومتا جلسة مؤقتتان اختياريتان — لا تدخلان SavedPage أبدًا، ولا تُستخدمان
   * لإعادة العثور على التبويب لاحقًا؛ لا ضمان لبقاء tabId صالحًا.
   */
  tabId?: number
  windowId?: number
}

/**
 * سبب تعذّر التقاط تبويب — منظَّم ومفيد، ولا يكشف قيمة غير متاحة أصلًا.
 * «مفقود» تشمل الغياب والفراغ والمسافات وحدها: القيمة غير متاحة فعليًا في الثلاث.
 */
export type UnavailableTabReason = 'missing-url' | 'missing-title'

/**
 * تبويب لم يمرّ كصالح — يُذكر بترتيبه وسببه فقط.
 *
 * يعيش هنا مع `BrowserTabSnapshot` لا في `browser/`: الواجهة تعرض عدد هذه
 * التبويبات فتحتاج نوعها، و`ui → browser` ممنوع (قرار 0005). `core` هي النقطة
 * المحايدة التي تستوردها الطبقات الثلاث دون كسر أي حد.
 */
export interface UnavailableTab {
  index: number
  reason: UnavailableTabReason
}

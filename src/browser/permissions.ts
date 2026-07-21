/**
 * صلاحية `tabs` الاختيارية — فحص وطلب منفصلان بوضوح عن قراءة التبويبات نفسها.
 *
 * `chrome.*` محصورة هنا. انظر docs/decisions/0004-permissions.md لسبب كون
 * `tabs` اختيارية أصلًا، وdocs/decisions/0011-tab-capture.md لقرارات هذه
 * المرحلة تحديدًا.
 */

/** يتحقق من منح صلاحية `tabs` دون طلبها. لا يعرض أي واجهة، ولا أثر جانبي. */
export async function hasTabsPermission(): Promise<boolean> {
  return chrome.permissions.contains({ permissions: ['tabs'] })
}

export type RequestTabsPermissionResult =
  | { granted: true }
  | { granted: false; reason: 'denied' | 'api-error'; message?: string }

/**
 * يطلب صلاحية `tabs`. يجب استدعاؤها مباشرة داخل معالج فعل صريح من المستخدم
 * (نقر زر، مثلًا) بلا أي عملية غير متزامنة قبلها — التوثيق الرسمي لـ
 * chrome.permissions.request يشترط استدعاءها من داخل user gesture مباشرة؛
 * استدعاؤها من عامل الخدمة أو أثناء التحميل يفشل أو يُرفض دون عرض أي طلب.
 *
 * لا تُستدعى تلقائيًا من أي مكان في هذه المرحلة؛ العقد جاهز فقط لزر مستقبلي.
 */
export async function requestTabsPermission(): Promise<RequestTabsPermissionResult> {
  try {
    const granted = await chrome.permissions.request({ permissions: ['tabs'] })
    return granted ? { granted: true } : { granted: false, reason: 'denied' }
  } catch (error) {
    return {
      granted: false,
      reason: 'api-error',
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

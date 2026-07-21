/**
 * تنسيق فحص صلاحية `tabs` وطلبها.
 *
 * موجودة حتى لا تستدعي ui طبقة browser مباشرة — تمامًا كما src/app/side-panel.ts
 * لفتح اللوحة. لا منطق إضافي هنا: تمرير مباشر فقط، حتى يبقى استدعاء الطلب من
 * زر مستقبلي داخل معالج نقره مباشرة، دون أي عملية غير متزامنة تُدرَج قبله
 * تُبطل صلاحية user gesture الذي يشترطه chrome.permissions.request.
 */

import {
  hasTabsPermission as hasTabsPermissionInBrowser,
  requestTabsPermission as requestTabsPermissionInBrowser,
  type RequestTabsPermissionResult,
} from '../browser/permissions'

export async function hasTabsPermission(): Promise<boolean> {
  return hasTabsPermissionInBrowser()
}

export async function requestTabsPermission(): Promise<RequestTabsPermissionResult> {
  return requestTabsPermissionInBrowser()
}

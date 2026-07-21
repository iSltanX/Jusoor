/**
 * بيانات صفحة «حول».
 *
 * تنسيق خفيف كبقية طبقة app: تمرير قراءة الإصدار وفحص التحديث من طبقة browser
 * إلى ui التي لا يجوز لها استدعاء browser مباشرة (حارس اتجاه الاعتماد).
 */

import { readExtensionVersion, requestUpdateCheck, type UpdateCheckResult } from '../browser/runtime-info'

export type { UpdateCheckResult }

/** رقم إصدار الإضافة من الـmanifest المشحون، أو undefined خارج سياق الإضافة. */
export function getExtensionVersion(): string | undefined {
  return readExtensionVersion()
}

/** يطلب فحص تحديث فوريًا عبر آلية المتصفح الموجودة أصلًا — بلا منطق موازٍ. */
export function checkForUpdates(): Promise<UpdateCheckResult> {
  return requestUpdateCheck()
}

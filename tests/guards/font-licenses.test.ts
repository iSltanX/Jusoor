import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { PROJECT_ROOT } from './project-files'

/**
 * حارس تراخيص الخطوط.
 *
 * خطا Almarai و Cairo يُعاد توزيعهما داخل الحزمة كملفات `.ttf`، ورخصة
 * SIL Open Font License 1.1 توجب إرفاق نص الترخيص مع أي إعادة توزيع. شحن الخط
 * بلا ترخيصه مخالفة رخصة لا نقص تنظيم، ولا يظهر في أي فحص آخر — فيُفرض هنا.
 *
 * الفحص على **المخرجات المبنية** لا على `licenses/` وحدها: وجود الملف في
 * المستودع لا يعني وصوله إلى المستخدم، وهذا بالضبط ما كان ناقصًا قبل م6.
 */

const BUILD_TARGETS = ['chrome-mv3', 'edge-mv3'] as const
const REQUIRED_LICENSES = ['Almarai-OFL.txt', 'Cairo-OFL.txt'] as const

function outputDir(target: string): string {
  return join(PROJECT_ROOT, '.output', target)
}

describe('حارس تراخيص الخطوط — المصدر', () => {
  it.each(REQUIRED_LICENSES)('%s موجود في licenses/fonts', (license) => {
    expect(existsSync(join(PROJECT_ROOT, 'licenses', 'fonts', license))).toBe(true)
  })

  it.each(REQUIRED_LICENSES)('%s يحمل نص OFL 1.1 لا ملفًا فارغًا', (license) => {
    const text = readFileSync(join(PROJECT_ROOT, 'licenses', 'fonts', license), 'utf8')

    expect(text).toContain('SIL OPEN FONT LICENSE Version 1.1')
    expect(text).toContain('PERMISSION & CONDITIONS')
  })
})

/*
 * `it.skipIf` لا `if (!existsSync) continue` — الأخيرة تترك describe.each بلا أي
 * `it()` مسجَّل حين لا توجد .output/ إطلاقًا (بيئة نظيفة تمامًا)، فيفشل vitest
 * بـ«لا اختبار في هذا المجمع» بدل التخطي الصامت المقصود.
 */
describe.each(BUILD_TARGETS)('حارس تراخيص الخطوط — مخرجات %s', (target) => {
  const dir = outputDir(target)
  const built = existsSync(dir)

  it.skipIf(!built)('يشحن خطوطًا فعلًا', () => {
    const assets = join(dir, 'assets')
    expect(existsSync(assets)).toBe(true)
  })

  it.skipIf(!built).each(REQUIRED_LICENSES)('يشحن %s مع الخطوط', (license) => {
    const shipped = join(dir, 'licenses', license)

    expect(
      existsSync(shipped),
      `${target} يعيد توزيع خطوط OFL بلا ${license} — مخالفة رخصة`,
    ).toBe(true)
  })
})

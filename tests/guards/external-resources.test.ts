import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  collectFiles,
  matchingLines,
  readProjectFile,
  stripComments,
  toPosix,
  PROJECT_ROOT,
} from './project-files'

/**
 * حارس الموارد الخارجية.
 *
 * لا CDN ولا خط ولا أيقونة ولا أي مورد يُحمَّل من الشبكة — دستور الهوية §7.1
 * ودستور المنتج §11.4 (العمل دون اتصال).
 */

/**
 * نصوص نطاقات لا تُحمَّل إطلاقًا.
 *
 * - مساحات أسماء XML ومعرّفات معيارية: تعريفات لا موارد.
 * - `react.dev/errors/`: تركّبه React نصًّا داخل رسالة الخطأ المصغّرة ليقرأه المطور،
 *   ولا يُطلب من الشبكة. مُتحقَّق منه يدويًا في مخرجات البناء.
 *   الفحص الأقوى هو اختبار «لا استدعاء شبكة في المخرجات» أدناه.
 * - حساب المطور المعتمد على GitHub: **روابط تنقّل لا موارد** — تفتحها شاشة
 *   «حول» بنقرة صريحة من المستخدم في تبويب جديد، ولا يُحمَّل منها شيء داخل
 *   صفحات الإضافة. `connect-src 'none'` باقٍ يمنع كل اتصال وقت التشغيل،
 *   واختبار «لا استدعاء شبكة في المخرجات» أدناه بلا استثناء. المصدر المركزي
 *   الوحيد لهذه الروابط `src/core/project-links.ts`، ويثبت ذلك حارس
 *   tests/guards/developer-credit.test.ts —
 *   docs/decisions/0017-about-page-and-developer-credit.md
 */
const ALLOWED = [
  'http://www.w3.org/',
  'https://www.w3.org/',
  'http://schemas.',
  'https://react.dev/errors/',
  'https://github.com/iSltanX',
]

const REMOTE_URL = /https?:\/\/[^\s'"()]+/g

function remoteReferences(source: string): string[] {
  return [...source.matchAll(REMOTE_URL)]
    .map((match) => match[0])
    .filter((url) => !ALLOWED.some((prefix) => url.startsWith(prefix)))
}

describe('حارس الموارد الخارجية — المصدر', () => {
  const sources = collectFiles('src', ['.ts', '.tsx', '.css', '.html'])

  it.each(sources)('%s لا يشير إلى مورد بعيد', (file) => {
    const code = stripComments(readProjectFile(file))
    const remote = remoteReferences(code)

    expect(remote, `${toPosix(file)} يشير إلى ${remote.join('، ')}`).toEqual([])
  })

  it('الخطوط محلية من حزمة الهوية', () => {
    const typography = readProjectFile('src/ui/theme/typography.css')

    expect(typography).toContain('identity/fonts/')
    expect(typography).not.toMatch(/fonts\.googleapis|fonts\.gstatic|@import\s+url\(['"]?https/)
  })
})

/** يعمل بعد `pnpm build` ويتخطى إن لم يوجد بناء. */
describe('حارس الموارد الخارجية — المخرجات المبنية', () => {
  const outputRoot = join(PROJECT_ROOT, '.output/chrome-mv3')
  const built = existsSync(outputRoot)

  it.skipIf(!built)('لا مورد بعيد في ملفات البناء', () => {
    const files = collectFiles('.output/chrome-mv3', ['.js', '.css', '.html'])
    const offenders: string[] = []

    for (const file of files) {
      const remote = remoteReferences(readProjectFile(file))
      if (remote.length > 0) offenders.push(`${toPosix(file)} → ${remote.join('، ')}`)
    }

    expect(offenders).toEqual([])
  })

  it.skipIf(!built)('ملفات الخطوط مضمَّنة في الحزمة المبنية', () => {
    const fonts = collectFiles('.output/chrome-mv3', ['.ttf'])
    expect(fonts.length).toBeGreaterThanOrEqual(4)
  })

  /**
   * أقوى فحص في هذا الملف: يفحص الكود المشحون فعلًا لا المصدر.
   * هو ما كشف ترقيع modulePreload الذي كان يحقن fetch() في الحزمة.
   */
  it.skipIf(!built)('لا استدعاء شبكة في المخرجات', () => {
    const files = collectFiles('.output/chrome-mv3', ['.js'])
    const network = /\bfetch\s*\(|\bXMLHttpRequest\b|\bnew WebSocket\b|\bEventSource\b|\bsendBeacon\b/
    const offenders: string[] = []

    for (const file of files) {
      const hits = matchingLines(readProjectFile(file), network)
      if (hits.length > 0) offenders.push(`${toPosix(file)} → ${hits.length} موضع`)
    }

    expect(offenders).toEqual([])
  })
})

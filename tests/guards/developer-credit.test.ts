import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  collectFiles,
  readProjectFile,
  stripComments,
  toPosix,
  PROJECT_ROOT,
} from './project-files'
import {
  CHANGELOG_URL,
  DEVELOPER_GITHUB_URL,
  NEW_ISSUE_URL,
  RELEASES_URL,
  REPOSITORY_URL,
} from '../../src/core/project-links'

/**
 * حارس حقوق المطور وروابط المشروع.
 *
 * علامة سلطان المصغرة في شاشة «حول» منقولة من حزمة Sultan Visual Identity
 * (`assets/monogram/sultan-monogram-brand.svg`)، وقاعدة سلامتها المعلنة في
 * الحزمة: «Preserve path data and proportions. Recolor, scale, and position
 * only». هذا الحارس يثبت الالتزام بها من جهتين:
 *
 *   1. بيانات المسار حرفية لم تُحرَّف — فلا «نسخة تقريبية» من توقيع المطور.
 *   2. ألوان هوية سلطان لا تدخل مصدر جُسور — إعادة التلوين إلى Tokens جُسور
 *      شرط الاندماج، فلا تنشأ هوية بصرية ثانية داخل المنتج (§15 هوية جُسور).
 *
 * ويثبت أن روابط المشروع كلها من المصدر المركزي الواحد وتحت الحساب المعتمد —
 * docs/decisions/0017-about-page-and-developer-credit.md
 */

/** بيانات مسار العلامة المصغرة كما في الحزمة حرفيًا — لا تُعدَّل هنا ولا هناك. */
const MONOGRAM_PATHS = [
  'M24 63H74',
  'M35 63V45',
  'M48 63V42',
  'M61 63V45',
  'M74 63q7 11-3 17',
] as const

/** سماكة خط العلامة كما في الحزمة. */
const MONOGRAM_STROKE_WIDTH = '8.5'

/**
 * ألوان هوية سلطان — لا موضع لها في جُسور:
 * النحاسي وقرميديّه، وورقيّ الخلفيات وحبرها، ونصّا أصول الحقوق.
 */
const SULTAN_COLORS = /#(?:D2916C|985333|F5F3ED|F2F1EC|172126|899398)/i

describe('حارس علامة المطور', () => {
  const aboutScreen = readProjectFile('src/ui/AboutScreen.tsx')

  it.each(MONOGRAM_PATHS)('مسار العلامة %s حرفي كما في الحزمة', (path) => {
    expect(aboutScreen).toContain(`"${path}"`)
  })

  it('سماكة خط العلامة كما في الحزمة', () => {
    expect(aboutScreen).toContain(`strokeWidth="${MONOGRAM_STROKE_WIDTH}"`)
  })

  it('العلامة تُلوَّن بـ currentColor لا بلون حرفي', () => {
    expect(aboutScreen).toContain('stroke="currentColor"')
  })

  const sources = collectFiles('src', ['.ts', '.tsx', '.css', '.html'])

  it.each(sources)('%s خالٍ من ألوان هوية سلطان', (file) => {
    const code = stripComments(readProjectFile(file))
    expect(
      SULTAN_COLORS.test(code),
      `${toPosix(file)} يحمل لونًا من هوية سلطان — تُستهلك البنية ويعاد التلوين بـTokens جُسور وحدها`,
    ).toBe(false)
  })
})

describe('حارس روابط المشروع', () => {
  it('كل الروابط تحت حساب المطور المعتمد', () => {
    for (const url of [REPOSITORY_URL, RELEASES_URL, NEW_ISSUE_URL, CHANGELOG_URL]) {
      expect(url.startsWith(`${DEVELOPER_GITHUB_URL}/`)).toBe(true)
    }
  })

  it('المستودع بالاسم المعتمد في docs/repository.md', () => {
    expect(REPOSITORY_URL).toBe('https://github.com/iSltanX/jusoor')
  })

  it('رابط البلاغ يفتح إنشاء بلاغ جديد مباشرة', () => {
    expect(NEW_ISSUE_URL).toBe(`${REPOSITORY_URL}/issues/new`)
  })

  it('لا رابط GitHub حرفي خارج المصدر المركزي', () => {
    const offenders = collectFiles('src', ['.ts', '.tsx'])
      .filter((file) => toPosix(file) !== 'src/core/project-links.ts')
      .filter((file) => /https:\/\/github\.com\//.test(stripComments(readProjectFile(file))))

    expect(offenders.map(toPosix)).toEqual([])
  })
})

/** يعمل بعد `pnpm build` ويتخطى إن لم يوجد بناء — كبقية فحوص المخرجات. */
describe('حارس المخرجات — لا أصول سلطان في الحزمة المبنية', () => {
  const outputRoot = join(PROJECT_ROOT, '.output/chrome-mv3')
  const built = existsSync(outputRoot)

  it.skipIf(!built)('لا ملف من حزمة هوية سلطان في المخرجات', () => {
    const files = collectFiles('.output/chrome-mv3', [''])
    const sultanFiles = files.filter((file) => /sultan/i.test(toPosix(file)))

    expect(sultanFiles.map(toPosix)).toEqual([])
  })

  it.skipIf(!built)('لا لون من هوية سلطان في المخرجات', () => {
    const files = collectFiles('.output/chrome-mv3', ['.js', '.css', '.html'])
    const offenders = files.filter((file) => SULTAN_COLORS.test(readProjectFile(file)))

    expect(offenders.map(toPosix)).toEqual([])
  })
})

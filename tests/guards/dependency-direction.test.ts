import { describe, expect, it } from 'vitest'

import {
  collectFiles,
  readProjectFile,
  stripComments,
  toPosix,
} from './project-files'

/**
 * حارس اتجاه الاعتماد المعماري المعتمد:
 *
 *   entrypoints → ui → app → core
 *                       ├→ storage
 *                       └→ browser
 *
 * انظر docs/decisions/0005-dependency-direction.md
 */

const IMPORT_PATTERN = /(?:from|import)\s+['"]([^'"]+)['"]/g

/** يستخرج طبقة المشروع التي يشير إليها استيراد نسبي. */
function importedLayer(fromFile: string, specifier: string): string | undefined {
  if (!specifier.startsWith('.')) return undefined

  const segments = toPosix(fromFile).split('/')
  segments.pop()

  for (const part of specifier.split('/')) {
    if (part === '.' || part === '') continue
    if (part === '..') segments.pop()
    else segments.push(part)
  }

  // نتوقع src/<layer>/...
  return segments[0] === 'src' ? segments[1] : undefined
}

function importsOf(file: string): string[] {
  const code = stripComments(readProjectFile(file))
  const layers: string[] = []

  for (const match of code.matchAll(IMPORT_PATTERN)) {
    const specifier = match[1]
    if (specifier === undefined) continue

    const layer = importedLayer(file, specifier)
    if (layer !== undefined) layers.push(layer)
  }

  return layers
}

/** الطبقات المسموح لكل طبقة أن تستوردها. */
const ALLOWED: Record<string, readonly string[]> = {
  // core خالص: لا يستورد أي طبقة أخرى إطلاقًا.
  core: [],
  // browser يعرف أنواع core فقط.
  browser: ['core'],
  // storage يعرف core، ويمر عبر browser للوصول إلى تخزين الإضافة.
  storage: ['core', 'browser'],
  // app طبقة التنسيق: الوحيدة التي تجمع الثلاثة.
  app: ['core', 'storage', 'browser'],
  // ui تستدعي app فقط، وتستورد من core أنواعًا ودوال خالصة لا آثار لها.
  ui: ['app', 'core', 'i18n'],
  i18n: ['core'],
  // entrypoints للتركيب: توصل الأسطح بما تحتاجه.
  entrypoints: ['ui', 'app', 'browser', 'core', 'i18n'],
}

describe('حارس اتجاه الاعتماد', () => {
  const sources = collectFiles('src', ['.ts', '.tsx'])

  it.each(sources)('%s يحترم حدود طبقته', (file) => {
    const layer = toPosix(file).split('/')[1]
    if (layer === undefined) return

    const allowed = ALLOWED[layer]
    if (allowed === undefined) return

    const violations = importsOf(file).filter(
      (imported) => imported !== layer && !allowed.includes(imported),
    )

    expect(
      violations,
      `${toPosix(file)} في طبقة ${layer} يستورد من ${violations.join('، ')}`,
    ).toEqual([])
  })

  it('ui لا تستدعي storage ولا browser مباشرة', () => {
    const offenders = collectFiles('src/ui', ['.ts', '.tsx']).filter((file) => {
      const layers = importsOf(file)
      return layers.includes('storage') || layers.includes('browser')
    })

    expect(offenders.map(toPosix)).toEqual([])
  })

  it('core لا يستورد أي طبقة أخرى', () => {
    const offenders = collectFiles('src/core', ['.ts']).filter(
      (file) => importsOf(file).filter((layer) => layer !== 'core').length > 0,
    )

    expect(offenders.map(toPosix)).toEqual([])
  })

  it('core خالٍ من DOM و IndexedDB و React', () => {
    const forbidden = /\b(document|window|indexedDB|IDBFactory)\b|from\s+['"]react/

    const offenders = collectFiles('src/core', ['.ts']).filter((file) =>
      forbidden.test(stripComments(readProjectFile(file))),
    )

    expect(offenders.map(toPosix)).toEqual([])
  })
})

/**
 * حارس نقاء الوقت والمعرفات داخل core/.
 *
 * core/ لا يولّد وقتًا ولا معرفات بنفسه — تُستقبل كوسيط صريح من app/ لاحقًا،
 * فيبقى المنطق قابلًا للاختبار بقيم ثابتة بلا عشوائية ولا ساعة نظام — انظر
 * docs/decisions/0009-data-model.md وsrc/core/workspace.ts وsrc/core/ids.ts.
 *
 * النمط يطابق الاستدعاء الفعلي فقط (بأقواس، مع تجاوز فراغ حول النقاط)، لا مجرد
 * ورود الاسم في نص — تقليل مقصود لاحتمال نتائج كاذبة عن بحث ساذج على السلسلة
 * الحرفية. التعليقات تُستبعد قبل المطابقة عبر stripComments كبقية حراس المشروع،
 * فذكر هذه الأنماط في تعليق توثيقي لا يُسقط الفحص — والاختبارات أدناه تثبت ذلك
 * مباشرة على النمط نفسه المستخدم في الفحص الحقيقي، بلا حاجة لملف مخالف في src/.
 */
const FORBIDDEN_TIME_AND_ID_APIS =
  /\bDate\s*\.\s*now\s*\(\s*\)|\b(?:globalThis\s*\.\s*)?crypto\s*\.\s*randomUUID\s*\(\s*\)/

describe('حارس نقاء الوقت والمعرفات', () => {
  it('core/ لا يستدعي Date.now() ولا crypto.randomUUID() فعليًا', () => {
    const offenders = collectFiles('src/core', ['.ts']).filter((file) =>
      FORBIDDEN_TIME_AND_ID_APIS.test(stripComments(readProjectFile(file))),
    )

    expect(offenders.map(toPosix)).toEqual([])
  })

  it('النمط يكتشف Date.now() في كود فعلي', () => {
    expect(FORBIDDEN_TIME_AND_ID_APIS.test(stripComments('const t = Date.now()'))).toBe(true)
  })

  it('النمط يكتشف crypto.randomUUID() في كود فعلي', () => {
    expect(
      FORBIDDEN_TIME_AND_ID_APIS.test(stripComments('const id = crypto.randomUUID()')),
    ).toBe(true)
  })

  it('النمط يكتشف globalThis.crypto.randomUUID() في كود فعلي', () => {
    expect(
      FORBIDDEN_TIME_AND_ID_APIS.test(
        stripComments('const id = globalThis.crypto.randomUUID()'),
      ),
    ).toBe(true)
  })

  it('النمط يتجاهل تفاوت الفراغ حول النقاط والأقواس (بحث غير ساذج)', () => {
    expect(FORBIDDEN_TIME_AND_ID_APIS.test('const t = Date . now ( )')).toBe(true)
    expect(FORBIDDEN_TIME_AND_ID_APIS.test('crypto . randomUUID ( )')).toBe(true)
  })

  it('النمط يتجاهل ذكرها داخل تعليق سطر واحد', () => {
    const commented = "// لا تستدعِ Date.now() ولا crypto.randomUUID() هنا\nexport const x = 1"
    expect(FORBIDDEN_TIME_AND_ID_APIS.test(stripComments(commented))).toBe(false)
  })

  it('النمط يتجاهل ذكرها داخل تعليق JSDoc كتلي', () => {
    const commented = '/**\n * لا تستخدم Date.now() أو crypto.randomUUID() هنا أبدًا.\n */\nexport const y = 2'
    expect(FORBIDDEN_TIME_AND_ID_APIS.test(stripComments(commented))).toBe(false)
  })
})

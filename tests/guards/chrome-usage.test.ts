import { describe, expect, it } from 'vitest'

import {
  collectFiles,
  matchingLines,
  readProjectFile,
  stripComments,
  toPosix,
} from './project-files'

/**
 * حارس حدود واجهات المتصفح.
 *
 * `chrome.*` مسموح بها في src/browser وحدها، **بلا استثناء**. هذا ما يبقي
 * core و storage و ui قابلة للاختبار دون متصفح، وما يجعل دعم Firefox لاحقًا
 * استبدالًا لطبقة واحدة. انظر docs/decisions/0005-dependency-direction.md
 *
 * لا تُضف قائمة استثناءات هنا. أي حاجة حقيقية إلى واجهة متصفح تُغلَّف في
 * src/browser وتُستدعى من app؛ نقاط الدخول للتركيب لا للاستدعاء المباشر.
 */

const CHROME_USAGE = /\bchrome\s*\./

describe('حارس chrome.*', () => {
  const sources = collectFiles('src', ['.ts', '.tsx'])

  it('يفحص ملفات مصدر فعلية', () => {
    expect(sources.length).toBeGreaterThan(10)
  })

  it.each(sources)('%s لا يستخدم chrome.* خارج src/browser', (file) => {
    const path = toPosix(file)

    if (path.startsWith('src/browser/')) return

    const code = stripComments(readProjectFile(file))

    expect(
      matchingLines(code, CHROME_USAGE),
      `استخدام chrome.* غير مسموح في ${path}`,
    ).toEqual([])
  })

  it('طبقة browser هي فعلًا من يلمس واجهة المتصفح', () => {
    const browserFiles = collectFiles('src/browser', ['.ts'])
    const touching = browserFiles.filter((file) =>
      CHROME_USAGE.test(stripComments(readProjectFile(file))),
    )

    expect(touching.length).toBeGreaterThan(0)
  })
})

import { describe, expect, it } from 'vitest'

import { collectFiles, readProjectFile, stripComments, toPosix } from './project-files'

/**
 * حارس نقاء app/: طبقة تنسيق بين core/ وstorage/ فقط — لا واجهة، لا DOM، لا React.
 *
 * حارس اتجاه الاعتماد (dependency-direction.test.ts) يمنع بالفعل app/ من استيراد
 * ui/ عبر مسار نسبي، وحارس chrome-usage.test.ts يمنع استخدام chrome.* في app/
 * ضمن فحصه لكل src/. هذا الملف يسد الفجوة المتبقية: حزمة 'react' تُستورد بمعرّف
 * مطلق لا نسبي، فلا يلتقطها فحص الطبقات النسبي في dependency-direction.test.ts.
 */

const REACT_IMPORT = /from\s+['"]react(-dom)?(\/[^'"]*)?['"]/
const DOM_GLOBALS = /\b(document|window)\b/

/**
 * يزيل مسار الوحدة المقتبس من عبارات الاستيراد قبل فحص أسماء DOM.
 *
 * اسم ملف مثل `./window-tabs` يطابق `\bwindow\b` (الشرطة والنقطة حدّا كلمة)،
 * فيصبح اسم وحدة سببًا لفشل حارس لا علاقة له بالتسمية. الفحص يستهدف **استخدام**
 * متغير DOM عام، لا نصًّا داخل مسار — تمامًا كما تُستبعد التعليقات قبله.
 *
 * الإزالة مقصورة على المسار داخل `from '...'` و`import '...'`، فلا تُخفي أي
 * وصول حقيقي: `window.x` و`globalThis['window']` و`document` تبقى كلها مكشوفة.
 */
function stripModuleSpecifiers(source: string): string {
  return source.replace(/(\bfrom\s+|\bimport\s+)(['"])[^'"]*\2/g, '$1$2$2')
}

describe('حارس نقاء app/', () => {
  const sources = collectFiles('src/app', ['.ts', '.tsx'])

  it('يفحص ملفات فعلية داخل src/app', () => {
    expect(sources.length).toBeGreaterThan(0)
  })

  it.each(sources)('%s لا يستورد react أو react-dom', (file) => {
    const code = stripComments(readProjectFile(file))
    expect(REACT_IMPORT.test(code), `استيراد react في ${toPosix(file)}`).toBe(false)
  })

  it.each(sources)('%s لا يستخدم document أو window', (file) => {
    const code = stripModuleSpecifiers(stripComments(readProjectFile(file)))
    expect(DOM_GLOBALS.test(code), `استخدام DOM في ${toPosix(file)}`).toBe(false)
  })

  it('إزالة مسار الوحدة لا تُخفي استخدامًا حقيقيًا لـ DOM', () => {
    // اسم الوحدة وحده يمر…
    expect(DOM_GLOBALS.test(stripModuleSpecifiers("import { x } from './window-tabs'"))).toBe(
      false,
    )
    // …بينما كل وصول فعلي يبقى مكشوفًا، وإن جاور استيرادًا في السطر نفسه.
    expect(DOM_GLOBALS.test(stripModuleSpecifiers('const w = window.innerWidth'))).toBe(true)
    expect(DOM_GLOBALS.test(stripModuleSpecifiers("document.querySelector('a')"))).toBe(true)
    expect(DOM_GLOBALS.test(stripModuleSpecifiers("globalThis['window']"))).toBe(true)
    expect(
      DOM_GLOBALS.test(stripModuleSpecifiers("import './window-tabs'\nwindow.alert('x')")),
    ).toBe(true)
  })

  it('لا ملفات .tsx داخل src/app — لا مكوّنات واجهة في هذه الطبقة', () => {
    expect(collectFiles('src/app', ['.tsx'])).toEqual([])
  })
})

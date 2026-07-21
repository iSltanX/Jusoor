import { describe, expect, it } from 'vitest'

import {
  collectFiles,
  matchingLines,
  readProjectFile,
  stripComments,
  toPosix,
} from './project-files'

/**
 * حارس القيم البصرية.
 *
 * مكونات المنتج تستهلك Tokens المعتمدة ولا تعرّف قيمًا لونية بنفسها،
 * وتستخدم الخصائص المنطقية حتى يعمل RTL و LTR بالبنية نفسها — دستور الهوية §12 و§15.
 *
 * ملفات src/ui/theme هي موضع القيم المشتقة من الدستور، فهي المستثناة الوحيدة.
 */

const THEME_DIRECTORY = 'src/ui/theme/'

const HEX_COLOR = /#[0-9a-fA-F]{3,8}\b/
const COLOR_FUNCTION = /\b(?:rgba?|hsla?)\s*\(/

/**
 * خصائص اتجاهية مادية لها بديل منطقي معتمد.
 *
 * الخاصية تُلتقط في موضعها سواء كانت في أول السطر أو بعد `{` أو `;`،
 * حتى لا تفلت القواعد المكتوبة في سطر واحد.
 */
const PHYSICAL_PROPERTIES =
  /(?:^|[;{])\s*(?:margin|padding|border|inset)-(?:left|right)\s*:|(?:^|[;{])\s*(?:left|right)\s*:|text-align\s*:\s*(?:left|right)\b|float\s*:\s*(?:left|right)\b/

describe('حارس القيم البصرية', () => {
  const stylesheets = collectFiles('src', ['.css'])

  it('يفحص ملفات أنماط فعلية', () => {
    expect(stylesheets.length).toBeGreaterThan(0)
  })

  const componentStyles = stylesheets.filter(
    (file) => !toPosix(file).startsWith(THEME_DIRECTORY),
  )

  it('توجد أنماط مكونات خارج طبقة السمة', () => {
    expect(componentStyles.length).toBeGreaterThan(0)
  })

  it.each(componentStyles)('%s لا يعرّف لونًا حرفيًا', (file) => {
    const css = stripComments(readProjectFile(file))

    expect(
      matchingLines(css, HEX_COLOR),
      `${toPosix(file)} يستخدم لونًا حرفيًا بدل Token معتمد`,
    ).toEqual([])

    expect(
      matchingLines(css, COLOR_FUNCTION),
      `${toPosix(file)} يستخدم دالة لون بدل Token معتمد`,
    ).toEqual([])
  })

  it.each(stylesheets)('%s لا يستخدم خاصية اتجاهية مادية', (file) => {
    const css = stripComments(readProjectFile(file))

    expect(
      matchingLines(css, PHYSICAL_PROPERTIES),
      `${toPosix(file)} يستخدم خاصية اتجاهية مادية بدل الخاصية المنطقية`,
    ).toEqual([])
  })

  it.each(collectFiles('src', ['.tsx']))('%s لا يحمل أنماطًا مضمَّنة', (file) => {
    const code = stripComments(readProjectFile(file))

    expect(
      matchingLines(code, /\bstyle=\{\{/),
      `${toPosix(file)} يحمل نمطًا مضمَّنًا خارج نظام Tokens`,
    ).toEqual([])
  })
})

/**
 * حارس تباين النص الخافت.
 *
 * `--j-text-muted` (‏`#737773`) لا يبلغ 4.5:1 على خلفية الوضع الفاتح، ودستور
 * الهوية §6.5 يورد عيّنات تباينه المعتمدة للنص الأساسي والثانوي **ولا يورد
 * عيّنة للنص الخافت** — فاستعماله لنصّ معلوماتي يخالف §13 («النصوص تحقق
 * WCAG AA»). القيمة نفسها لا تُمس (§15)؛ المقيَّد هو **موضع استعمالها**.
 *
 * يبقى مشروعًا في حالات التعطيل وحدها: WCAG تستثني عناصر التحكم المعطّلة من
 * حدود التباين صراحةً.
 */
describe('حارس تباين النص الخافت', () => {
  const stylesheets = collectFiles('src', ['.css'])

  /** يستخرج المحدد الذي تنتمي إليه كل قاعدة تستعمل التوكن. */
  function mutedTextSelectors(css: string): string[] {
    const found: string[] = []
    const blocks = css.split('}')

    for (const block of blocks) {
      if (!/color:\s*var\(--j-text-muted\)/.test(block)) continue
      const selector = block.split('{')[0]?.trim().replace(/\s+/g, ' ') ?? ''
      found.push(selector)
    }

    return found
  }

  it.each(stylesheets)('%s لا يستعمل النص الخافت إلا لحالة معطَّلة', (file) => {
    const css = stripComments(readProjectFile(file))

    const offenders = mutedTextSelectors(css).filter(
      (selector) => !selector.includes(':disabled'),
    )

    expect(
      offenders,
      `${toPosix(file)} يستعمل --j-text-muted لنص معلوماتي — يخالف WCAG AA (§13 هوية)`,
    ).toEqual([])
  })

  it('النمط يكتشف استعمالًا مخالفًا فعليًا', () => {
    expect(mutedTextSelectors('.j-caption { color: var(--j-text-muted); }')).toEqual([
      '.j-caption',
    ])
  })

  it('النمط يقبل حالة التعطيل', () => {
    const allowed = mutedTextSelectors('.j-button:disabled { color: var(--j-text-muted); }')
    expect(allowed.every((selector) => selector.includes(':disabled'))).toBe(true)
  })
})

/**
 * حارس اكتمال الأصناف الطباعية.
 *
 * صنف `j-type-*` مستخدم في مكوّن بلا قاعدة CSS لا يفشل ظاهرًا؛ يرث خط body
 * ‏(Cairo) صامتًا، فتُعرض عناوين دستورها Almarai 700 (§7.2 هوية) بخط النصوص
 * ووزنه وحجمه. وقع هذا فعلًا: h2 وcard-title وbody-sm وbody-lg استُخدمت
 * شهورًا بلا تعريف فحملت بطاقات المساحات والصفحات خط Cairo مكان Almarai.
 * القياس الفعلي للخطوط المرسومة (CSS.getPlatformFontsForNode) هو ما كشفه.
 */
describe('حارس اكتمال الأصناف الطباعية', () => {
  const TYPE_CLASS = /j-type-[a-z0-9-]+/g

  const usedClasses = new Set(
    collectFiles('src', ['.tsx']).flatMap((file) => {
      const code = stripComments(readProjectFile(file))
      return [...code.matchAll(TYPE_CLASS)].map((match) => match[0])
    }),
  )

  const definedClasses = new Set(
    collectFiles('src', ['.css']).flatMap((file) => {
      const css = stripComments(readProjectFile(file))
      return [...css.matchAll(/\.(j-type-[a-z0-9-]+)/g)]
        .map((match) => match[1])
        .filter((name): name is string => name !== undefined)
    }),
  )

  it('المقياس الطباعي مستهلَك فعلًا في CSS المكونات', () => {
    /*
     * بعد التكامل التنفيذي للهوية صارت مكونات panel.css تستهلك متغيرات
     * المقياس (--j-type-*-size/line) مباشرة بدل أصناف j-type-* في JSX،
     * فيقاس الاستهلاك هنا على المتغيرات لا على الأصناف.
     */
    const componentCss = collectFiles('src', ['.css'])
      .filter((file) => !toPosix(file).startsWith(THEME_DIRECTORY))
      .map((file) => stripComments(readProjectFile(file)))
      .join('\n')

    const typeVarUses = componentCss.match(/var\(--j-type-[a-z0-9-]+/g) ?? []
    expect(typeVarUses.length).toBeGreaterThan(20)
  })

  it('كل صنف طباعي مستخدم في المكونات له قاعدة CSS معرَّفة', () => {
    const undefined_ = [...usedClasses].filter((name) => !definedClasses.has(name))

    expect(
      undefined_,
      `أصناف طباعية مستخدمة بلا تعريف — سترث خط body صامتًا: ${undefined_.join('، ')}`,
    ).toEqual([])
  })
})

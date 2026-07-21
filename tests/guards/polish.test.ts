import { describe, expect, it } from 'vitest'

import { readProjectFile, stripComments } from './project-files'

/**
 * حارس مرحلة الصقل — يثبّت الإصلاحات الجذرية فلا ترتد:
 *
 * 1. أرقام الـStepper: سطر مطابق للدائرة لا سطر body الموروث (24px فوق 20px
 *    كان يُنزل الرقم ويُظهر امتدادًا سفليًا) — بلا أي إزاحة خاصة بلغة.
 * 2. مقياس الأزرار: lg بخط مستوى button المعتمد (§7.2)، وارتفاعا التحكم
 *    والمنطقة السفلية على حدود الهوية (44 / 62).
 * 3. حبر الحالات الملونة: الخلفيات الدلالية فاتحة في السمتين، فنصها من ألوان
 *    الدلالة لا من نص السمة — وإلا صار شبه غير مقروء في الوضع الداكن (وهو
 *    الضعف الموجود في المثال المرجعي نفسه، والدستور §13 مقدَّم عليه).
 * 4. حركة محرر نقطة التوقف بإيقاع الهوية، وتعطيل الحركة والتباين العالي
 *    مفعّلان في طبقة السمة.
 */

const panel = stripComments(readProjectFile('src/ui/panel.css'))
const theme = stripComments(readProjectFile('src/ui/theme/theme.css'))

function block(css: string, selector: string): string {
  const start = css.indexOf(selector)
  if (start === -1) return ''
  const open = css.indexOf('{', start)
  const close = css.indexOf('}', open)
  return css.slice(open, close)
}

describe('تمركز أرقام الـStepper', () => {
  it('سطر الرقم مطابق للدائرة لا موروثًا من body', () => {
    const stepper = block(panel, '.stepper span {')
    expect(stepper).toContain('line-height: 1')
  })

  it('لا إزاحة يدوية خاصة بلغة أو اتجاه في الـStepper', () => {
    const section = panel.slice(panel.indexOf('.stepper'), panel.indexOf('.template-grid'))
    expect(section).not.toMatch(/top:|translate\(|\[dir='rtl'\]|:lang\(/)
  })
})

describe('مقياس الأزرار السفلية', () => {
  it('lg بارتفاع التحكم المعتمد وخط مستوى button لا خط عناوين', () => {
    const lg = block(panel, '.button.lg {')
    expect(lg).toContain('min-block-size: var(--j-control-lg)')
    expect(lg).toContain('font-size: var(--j-type-button-size)')
    expect(lg).not.toContain('--j-type-h4-size')
  })

  it('المنطقة السفلية على حدها الأدنى الدستوري 62px بلا زيادة', () => {
    const bar = block(panel, '.panel-bottom-action {')
    expect(bar).toContain('min-block-size: 62px')
  })
})

describe('حبر الحالات على الخلفيات الدلالية', () => {
  it('رسائل التحذير تحمل حبر الدلالة لنصَّيها لا وراثة نص السمة', () => {
    expect(panel).toMatch(/\.system-message\.banner strong[\s\S]{0,80}--j-warning-600/)
    expect(panel).toMatch(/\.system-message\.banner > div > span[\s\S]{0,80}--j-warning-600/)
  })

  it('رسائل الخطأ تحمل حبر الدلالة لنصَّيها', () => {
    expect(panel).toMatch(/\.system-message\.error strong[\s\S]{0,80}--j-danger-600/)
    expect(panel).toMatch(/\.system-message\.error > div > span[\s\S]{0,80}--j-danger-600/)
  })

  it('نتيجتا الفتح الملونتان تحملان حبر دلالتهما للنص الثانوي كذلك', () => {
    expect(panel).toMatch(/\.restore-notice\.opened \.restore-notice-body > span[\s\S]{0,120}--j-success-600/)
    expect(panel).toMatch(/\.restore-notice\.unavailable \.restore-notice-body > span[\s\S]{0,120}--j-danger-600/)
  })

  it('لا عنبري بوصفه تحذيرًا عامًا في الرسائل — العنبري لنقطة العودة وحدها', () => {
    const banner = block(panel, '.system-message.banner {')
    expect(banner).not.toContain('--j-accent')
  })
})

describe('الحركة والوصول', () => {
  it('محرر نقطة التوقف يستخدم إيقاع الهوية الأساسي', () => {
    const editor = block(panel, '.checkpoint-editor {')
    expect(editor).toContain('var(--j-motion-base)')
  })

  it('طبقة السمة تعطّل الحركة وتقوّي الحدود عند تفضيل المستخدم', () => {
    expect(theme).toContain('prefers-reduced-motion: reduce')
    expect(theme).toContain('prefers-contrast: more')
  })
})

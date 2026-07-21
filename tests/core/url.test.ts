import { describe, expect, it } from 'vitest'

import { normalizeUrlForComparison } from '../../src/core/url'

/**
 * تطبيع محافظ عمدًا لاكتشاف التكرار — §9.5 دستور المنتج. الاختبارات هنا تثبت
 * ما لا يُطبَّع بقدر ما تثبت ما يُطبَّع: www. وhttp/https فروق حقيقية تُحفظ،
 * ومعاملات الاستعلام الوظيفية تبقى — تصحيح موثق في docs/decisions/0009-data-model.md
 */

describe('normalizeUrlForComparison — لا يمس الرابط الأصلي', () => {
  it('القيمة المعادة لا تُغيِّر المتغير الممرَّر (نقاء الدالة)', () => {
    const original = 'https://Example.com/Docs/'
    normalizeUrlForComparison(original)
    expect(original).toBe('https://Example.com/Docs/')
  })

  it('توقيعها (string) => string يجعلها عاجزة بنيويًا عن حذف أو دمج أي سجل', () => {
    // الدالة لا تستقبل قاعدة بيانات ولا مساحة ولا صفحة — لا تُصدِّر إلا نصًا،
    // فلا اتصال لها بالتخزين إطلاقًا. اكتشاف التكرار والقرار بشأنه يقعان في
    // طبقة أعلى تمامًا (src/storage/pages.ts، findPagesByNormalizedUrl) —
    // انظر تلك الدالة لاختبار أن التطابق لا يحذف ولا يدمج فعليًا.
    expect(normalizeUrlForComparison.length).toBe(1)
    expect(typeof normalizeUrlForComparison('https://example.com')).toBe('string')
  })
})

describe('normalizeUrlForComparison — المخطط', () => {
  it('http وhttps يُصغَّران لكن لا يُوحَّدان — فرق حقيقي يُحفظ', () => {
    const http = normalizeUrlForComparison('http://example.com/page')
    const https = normalizeUrlForComparison('https://example.com/page')

    expect(http).toBe('http://example.com/page')
    expect(https).toBe('https://example.com/page')
    expect(http).not.toBe(https)
  })

  it('المخطط الكبير يُصغَّر', () => {
    expect(normalizeUrlForComparison('HTTPS://example.com/page')).toBe(
      'https://example.com/page',
    )
  })
})

describe('normalizeUrlForComparison — اسم المضيف', () => {
  it('www. يُحفظ ولا يُزال', () => {
    expect(normalizeUrlForComparison('https://www.example.com/page')).toBe(
      'https://www.example.com/page',
    )
    expect(normalizeUrlForComparison('https://example.com/page')).toBe(
      'https://example.com/page',
    )
    // مضيفان مختلفان فعليًا لا يتساويان بعد التطبيع
    expect(normalizeUrlForComparison('https://www.example.com/page')).not.toBe(
      normalizeUrlForComparison('https://example.com/page'),
    )
  })

  it('اسم المضيف يُصغَّر', () => {
    expect(normalizeUrlForComparison('https://EXAMPLE.com/page')).toBe(
      'https://example.com/page',
    )
  })
})

describe('normalizeUrlForComparison — المنفذ', () => {
  it('يزيل المنفذ الافتراضي لـ https', () => {
    expect(normalizeUrlForComparison('https://example.com:443/page')).toBe(
      'https://example.com/page',
    )
  })

  it('يزيل المنفذ الافتراضي لـ http', () => {
    expect(normalizeUrlForComparison('http://example.com:80/page')).toBe(
      'http://example.com/page',
    )
  })

  it('يحافظ على منفذ غير افتراضي', () => {
    expect(normalizeUrlForComparison('http://example.com:8080/page')).toBe(
      'http://example.com:8080/page',
    )
  })
})

describe('normalizeUrlForComparison — الشرطة الأخيرة في المسار', () => {
  it('يزيل شرطة أخيرة واحدة', () => {
    expect(normalizeUrlForComparison('https://example.com/docs/')).toBe(
      'https://example.com/docs',
    )
  })

  it('لا يزيل شرطة من مسار بلا شرطة أصلًا', () => {
    expect(normalizeUrlForComparison('https://example.com/docs')).toBe(
      'https://example.com/docs',
    )
  })

  it('يحافظ على الجذر / ولا يفرغه', () => {
    expect(normalizeUrlForComparison('https://example.com/')).toBe('https://example.com/')
    expect(normalizeUrlForComparison('https://example.com')).toBe('https://example.com/')
  })
})

describe('normalizeUrlForComparison — معاملات الاستعلام', () => {
  it('يزيل معاملات التتبع المعتمدة فقط', () => {
    expect(
      normalizeUrlForComparison(
        'https://example.com/page?utm_source=x&utm_medium=y&gclid=z&fbclid=f&msclkid=m&mc_eid=e&igshid=i&yclid=yc',
      ),
    ).toBe('https://example.com/page')
  })

  it('يحافظ على معاملات الاستعلام الوظيفية', () => {
    expect(normalizeUrlForComparison('https://example.com/search?id=42&page=3')).toBe(
      'https://example.com/search?id=42&page=3',
    )
  })

  it('يرتب المعاملات الباقية أبجديًا', () => {
    expect(normalizeUrlForComparison('https://example.com/page?b=2&a=1')).toBe(
      'https://example.com/page?a=1&b=2',
    )
  })

  it('يزيل معاملات التتبع ويرتب الباقية معًا', () => {
    expect(
      normalizeUrlForComparison('https://example.com/page?z=1&utm_source=x&a=2'),
    ).toBe('https://example.com/page?a=2&z=1')
  })

  it('لا معاملات باقية بعد إزالة التتبع ⇒ بلا علامة استفهام', () => {
    expect(normalizeUrlForComparison('https://example.com/page?utm_source=only')).toBe(
      'https://example.com/page',
    )
  })
})

describe('normalizeUrlForComparison — Fragment', () => {
  it('يزيل fragment عاديًا', () => {
    expect(normalizeUrlForComparison('https://example.com/page#section')).toBe(
      'https://example.com/page',
    )
  })

  it('يحافظ على مسار SPA بصيغة #/route', () => {
    expect(normalizeUrlForComparison('https://example.com/app#/dashboard')).toBe(
      'https://example.com/app#/dashboard',
    )
  })

  it('يحافظ على مسار SPA بصيغة #!/route', () => {
    expect(normalizeUrlForComparison('https://example.com/app#!/dashboard')).toBe(
      'https://example.com/app#!/dashboard',
    )
  })

  it('fragment فارغ (# بلا محتوى) يُزال', () => {
    expect(normalizeUrlForComparison('https://example.com/page#')).toBe(
      'https://example.com/page',
    )
  })
})

describe('normalizeUrlForComparison — مخططات غير http(s)', () => {
  it('يصغّر المخطط فقط ويترك الباقي حرفيًا لمخطط المتصفح الداخلي', () => {
    expect(normalizeUrlForComparison('CHROME://Extensions/Page')).toBe(
      'chrome://Extensions/Page',
    )
  })

  it('يعامل file:// بالمثل — حرفيًا بعد تصغير المخطط فقط', () => {
    expect(normalizeUrlForComparison('FILE:///Users/X/Report.pdf')).toBe(
      'file:///Users/X/Report.pdf',
    )
  })

  it('about: بلا شرطتين مائلتين يُعامَل بنفس القاعدة', () => {
    expect(normalizeUrlForComparison('ABOUT:blank')).toBe('about:blank')
  })
})

describe('normalizeUrlForComparison — تجميع القواعد معًا', () => {
  it('يطبّق كل القواعد دفعة واحدة على رابط واقعي', () => {
    const input =
      'HTTPS://WWW.Example.com:443/Docs/?utm_source=newsletter&z=1&a=2#section'
    expect(normalizeUrlForComparison(input)).toBe(
      'https://www.example.com/Docs?a=2&z=1',
    )
  })

  it('نص بلا مخطط يُعاد كما هو دون رمي استثناء', () => {
    expect(normalizeUrlForComparison('ليس رابطًا صالحًا')).toBe('ليس رابطًا صالحًا')
  })

  it('مخطط http(s) بمحتوى غير قابل للتحليل فعليًا عبر new URL() يُعاد كما هو', () => {
    // يمر هذا الإدخال بفرع http(s) فعليًا (rawScheme === 'http') ويصطدم بالـ catch،
    // بخلاف الحالة أعلاه التي تُرفض قبل استدعاء new URL() لغياب المخطط أصلًا.
    expect(normalizeUrlForComparison('http://')).toBe('http://')
  })
})

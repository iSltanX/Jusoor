import { describe, expect, it } from 'vitest'

import {
  matchesPage,
  matchesWorkspace,
  normalizeForSearch,
  pageSearchText,
  toSearchTerms,
  workspaceSearchText,
} from '../../src/core/search'
import { asPageNoteId, asSavedPageId, asWorkspaceId } from '../../src/core/ids'
import type { SavedPage } from '../../src/core/page'
import type { Workspace } from '../../src/core/workspace'

/**
 * التطبيع العربي مقفل بقرار 0008: التشكيل، و«أ/إ/آ»، و«ي/ى» — لا غير.
 *
 * لذلك تثبت هذه الاختبارات **ما لا يُطبَّع** بقدر ما تثبت ما يُطبَّع: «ة/ه»
 * و«التطويل» و«ألف الوصل» و«الهاء/التاء المربوطة» فروق حقيقية تبقى، وأي توسيع
 * لاحق يجعل أحد هذه الاختبارات يفشل — وهو المقصود بالضبط.
 */

const WORKSPACE_ID = asWorkspaceId('w1')

function page(overrides: Partial<SavedPage> = {}): SavedPage {
  return {
    id: asSavedPageId('p1'),
    workspaceId: WORKSPACE_ID,
    url: 'https://example.com/privacy',
    title: 'دليل الخصوصية',
    capturedAt: 1000,
    order: 1024,
    progressStatus: 'not-started',
    notes: [],
    addedAt: 1000,
    updatedAt: 1000,
    ...overrides,
  }
}

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: WORKSPACE_ID,
    name: 'مقارنة أطر الخصوصية',
    template: 'general',
    status: 'active',
    createdAt: 1000,
    updatedAt: 1000,
    lastWorkedAt: 1000,
    ...overrides,
  }
}

describe('normalizeForSearch — نقاء الدالة', () => {
  it('لا تعدّل النص الممرَّر إليها', () => {
    const original = 'الخُصوصيّة'
    normalizeForSearch(original)
    expect(original).toBe('الخُصوصيّة')
  })

  it('حتمية: النداء نفسه يعطي الناتج نفسه', () => {
    expect(normalizeForSearch('إحصاء')).toBe(normalizeForSearch('إحصاء'))
  })
})

describe('normalizeForSearch — التطبيع المعتمد في 0008', () => {
  it('التشكيل يُزال', () => {
    // فتحة وضمة وكسرة وشدة وسكون وتنوين — النطاق U+064B–U+0652 كاملًا
    expect(normalizeForSearch('الخُصوصيّةْ')).toBe(normalizeForSearch('الخصوصية'))
    expect(normalizeForSearch('كِتابٌ')).toBe(normalizeForSearch('كتاب'))
    expect(normalizeForSearch('مُحمَّدًا')).toBe(normalizeForSearch('محمدا'))
  })

  it('«أ» و«إ» و«آ» تُوحَّد مع الألف المجردة', () => {
    const forms = ['أطر', 'إطر', 'آطر', 'اطر']
    const normalized = forms.map(normalizeForSearch)
    expect(new Set(normalized).size).toBe(1)
  })

  it('«ى» تُوحَّد مع «ي»', () => {
    expect(normalizeForSearch('مصطفى')).toBe(normalizeForSearch('مصطفي'))
    expect(normalizeForSearch('على')).toBe(normalizeForSearch('علي'))
  })

  it('التطبيع يجمع القواعد الثلاث معًا في كلمة واحدة', () => {
    expect(normalizeForSearch('أُولَى')).toBe(normalizeForSearch('اولي'))
  })
})

describe('normalizeForSearch — ما لا يُطبَّع (حدود 0008)', () => {
  it('«ة» و«ه» يبقيان مختلفين', () => {
    expect(normalizeForSearch('مكتبة')).not.toBe(normalizeForSearch('مكتبه'))
  })

  it('التطويل (الكشيدة) لا يُزال — ليس تشكيلًا', () => {
    expect(normalizeForSearch('بحـــث')).not.toBe(normalizeForSearch('بحث'))
  })

  it('ألف الوصل «ٱ» لا تُوحَّد مع الألف — غير مذكورة في 0008', () => {
    expect(normalizeForSearch('ٱسم')).not.toBe(normalizeForSearch('اسم'))
  })

  it('«ؤ» و«ئ» لا تُردّان إلى واو وياء', () => {
    expect(normalizeForSearch('مسؤول')).not.toBe(normalizeForSearch('مسوول'))
    expect(normalizeForSearch('مسائل')).not.toBe(normalizeForSearch('مسايل'))
  })

  it('الأرقام العربية والهندية تبقى مختلفة — لا تطبيع أرقام', () => {
    expect(normalizeForSearch('٣')).not.toBe(normalizeForSearch('3'))
  })
})

describe('normalizeForSearch — تكافؤ Unicode وحالة الأحرف', () => {
  it('«أ» المركّبة والمفكَّكة نصٌّ واحد بعد NFC', () => {
    /*
     * بالهروب الصريح لا بالحرف: الشكلان يبدوان متطابقين في المحرر، وكتابتهما
     * حرفيًا تجعل أي أداة تطبّع الملف تحوّل هذا الاختبار إلى مقارنة عقيمة تنجح بلا
     * معنى. الهروب يمنع ذلك بنيويًا، والتأكيد أدناه يثبت أنهما مختلفان فعلًا.
     */
    const composed = '\u0623'
    const decomposed = '\u0627\u0654'

    expect(composed).not.toBe(decomposed)
    expect(normalizeForSearch(composed)).toBe(normalizeForSearch(decomposed))
  })

  it('البحث الإنجليزي لا يتأثر بحالة الأحرف — §9.4 يوجب عمله بالإنجليزية', () => {
    expect(normalizeForSearch('Privacy')).toBe(normalizeForSearch('privacy'))
    expect(normalizeForSearch('GDPR')).toBe(normalizeForSearch('gdpr'))
  })

  it('اللاتينية لا تفقد حروفها بالتطبيع العربي', () => {
    expect(normalizeForSearch('Example.com/Docs')).toBe('example.com/docs')
  })
})

describe('toSearchTerms', () => {
  it('استعلام فارغ أو فراغ يعطي قائمة فارغة — «لم يبحث» لا «لا نتائج»', () => {
    expect(toSearchTerms('')).toEqual([])
    expect(toSearchTerms('   ')).toEqual([])
    expect(toSearchTerms('\n\t ')).toEqual([])
  })

  it('يفصل الكلمات ويطبّعها', () => {
    expect(toSearchTerms('أطر  الخُصوصية')).toEqual(['اطر', 'الخصوصية'])
  })

  it('يتجاهل الفراغ الطرفي', () => {
    expect(toSearchTerms('  بحث  ')).toEqual(['بحث'])
  })
})

describe('pageSearchText — الحقول المشمولة (§9.4)', () => {
  it('يشمل العنوان والرابط وسبب الفتح والوسوم ونصوص الملاحظات', () => {
    const text = pageSearchText(
      page({
        title: 'دليل الخصوصية',
        url: 'https://example.com/privacy',
        reason: 'مرجع أساسي للمقارنة',
        labels: ['مهمة', 'أعود إليها'],
        notes: [
          {
            id: asPageNoteId('n1'),
            body: 'الفقرة الثالثة تخالف المصدر الآخر',
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
      }),
    )

    expect(text).toContain('دليل الخصوصية')
    expect(text).toContain('example.com/privacy')
    expect(text).toContain('مرجع أساسي للمقارنة')
    expect(text).toContain('مهمة')
    expect(text).toContain('الفقرة الثالثة تخالف المصدر الآخر')
  })

  it('الحقول الغائبة لا تُقحم فراغًا يوسّع المطابقة', () => {
    const text = pageSearchText(page({ title: 'أ', url: 'ب' }))
    expect(text).toBe('أ\nب')
  })
})

describe('workspaceSearchText — الحقول المشمولة (§10.1)', () => {
  it('يشمل الاسم والهدف والوصف والملاحظة العامة ونقطة التوقف والخطوة التالية', () => {
    const text = workspaceSearchText(
      workspace({
        name: 'مقارنة الأطر',
        goal: 'أي إطار يناسب فريقًا صغيرًا؟',
        description: 'مراجعة تمهيدية',
        generalNote: 'التركيز على التكلفة',
        lastReached: 'ثلاثة أطر مرشحة',
        nextStep: 'قراءة دراسة الحالة',
      }),
    )

    for (const value of [
      'مقارنة الأطر',
      'أي إطار يناسب فريقًا صغيرًا؟',
      'مراجعة تمهيدية',
      'التركيز على التكلفة',
      'ثلاثة أطر مرشحة',
      'قراءة دراسة الحالة',
    ]) {
      expect(text).toContain(value)
    }
  })
})

describe('matchesPage', () => {
  it('قائمة كلمات فارغة تطابق كل شيء — لا بحث لا تصفية', () => {
    expect(matchesPage(page(), [])).toBe(true)
  })

  it('يطابق بالعربية عبر التطبيع المعتمد', () => {
    const target = page({ title: 'الخُصوصيّة في الأنظمة' })
    expect(matchesPage(target, toSearchTerms('الخصوصية'))).toBe(true)
    expect(matchesPage(target, toSearchTerms('الانظمة'))).toBe(true)
  })

  it('يطابق بالإنجليزية بلا حساسية لحالة الأحرف', () => {
    const target = page({ title: 'Privacy Frameworks Compared' })
    expect(matchesPage(target, toSearchTerms('privacy'))).toBe(true)
    expect(matchesPage(target, toSearchTerms('FRAMEWORKS'))).toBe(true)
  })

  it('يطابق داخل الرابط', () => {
    expect(matchesPage(page({ url: 'https://gdpr.eu/checklist' }), toSearchTerms('gdpr'))).toBe(
      true,
    )
  })

  it('يطابق داخل نص ملاحظة', () => {
    const target = page({
      notes: [
        { id: asPageNoteId('n1'), body: 'يحتاج تحققًا', createdAt: 1, updatedAt: 1 },
      ],
    })
    expect(matchesPage(target, toSearchTerms('تحقق'))).toBe(true)
  })

  it('كل الكلمات مطلوبة (AND) لا أيّها', () => {
    const target = page({ title: 'دليل الخصوصية', reason: 'مقارنة الأطر' })

    // كلمتان موجودتان في حقلين مختلفين — تطابق
    expect(matchesPage(target, toSearchTerms('الخصوصية الأطر'))).toBe(true)
    // كلمة واحدة غائبة تُسقط المطابقة كلها
    expect(matchesPage(target, toSearchTerms('الخصوصية تشفير'))).toBe(false)
  })

  it('لا يطابق ما ليس موجودًا', () => {
    expect(matchesPage(page(), toSearchTerms('تشفير'))).toBe(false)
  })

  it('حالة التقدم والدور ليستا نصًا يُبحث فيه — تُصفَّى لا تُطابَق', () => {
    const target = page({ progressStatus: 'complete', role: 'primary' })
    expect(matchesPage(target, toSearchTerms('complete'))).toBe(false)
    expect(matchesPage(target, toSearchTerms('primary'))).toBe(false)
  })
})

describe('matchesWorkspace', () => {
  it('قائمة كلمات فارغة تطابق كل شيء', () => {
    expect(matchesWorkspace(workspace(), [])).toBe(true)
  })

  it('يطابق نقطة التوقف والخطوة التالية', () => {
    const target = workspace({
      lastReached: 'ثلاثة أطر مرشحة',
      nextStep: 'قراءة دراسة الحالة',
    })

    expect(matchesWorkspace(target, toSearchTerms('مرشحة'))).toBe(true)
    expect(matchesWorkspace(target, toSearchTerms('دراسة'))).toBe(true)
  })

  it('يطابق بالتطبيع العربي المعتمد', () => {
    expect(matchesWorkspace(workspace({ name: 'إحصاءات الأداء' }), toSearchTerms('احصاءات'))).toBe(
      true,
    )
  })
})

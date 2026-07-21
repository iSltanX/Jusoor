/**
 * ترتيب صفحات المساحة وتصفيتها — دستور المنتج §9.4.
 *
 * دوال خالصة تمامًا، وأهم خاصية فيها **أنها لا تعدّل شيئًا**: لا تكتب في
 * التخزين، ولا تغيّر قيمة أدخلها المستخدم، ولا تمس المصفوفة الممرَّرة إليها
 * (كل ترتيب على نسخة، فـ`Array.prototype.sort` يعدّل في مكانه). التنظيم عرضٌ
 * للبيانات لا تحريرٌ لها؛ إعادة الترتيب المحفوظة فعليًا عملية أخرى تمامًا
 * (`reorderPages` في app/) تكتب حقل `order` بطلب صريح.
 *
 * حالة التقدم ودور الصفحة يبقيان **بعدين مستقلين** لا يُدمجان في قائمة واحدة —
 * دستور المنتج §7.3 ودستور الهوية §10.3 — فلكل واحد مرشِّحه المنفصل.
 */

import type { SavedPage } from './page'
import type { PageProgressStatus, PageRole } from './enums'
import { matchesPage } from './search'

// ===== الترتيب =====

/**
 * أوجه الترتيب المعتمدة — دستور المنتج §9.4 يعدّ ثلاثة: الترتيب الأصلي،
 * وتاريخ الإضافة، والأهمية. التقدم والدور يُغطَّيان بالتصفية أدناه لا بترتيب
 * ثالث ورابع، فترتيب قائمة بقيمة واحدة منها تصفيةٌ مقنَّعة أضعف.
 */
export const PAGE_SORT_ORDERS = ['original', 'added', 'importance'] as const
export type PageSortOrder = (typeof PAGE_SORT_ORDERS)[number]

/** الافتراضي هو ما رتّبه المستخدم بنفسه — لا تعيد الشاشة ترتيبه من تلقائها. */
export const DEFAULT_PAGE_SORT: PageSortOrder = 'original'

/**
 * «الأهمية» في §9.4 هي الصفحات الأساسية أولًا — الدلالة نفسها المستعملة في
 * §9.3 («الصفحات المهمة») وفي ملخص العودة (`important` في app/). لا حقل أهمية
 * مستقل في النموذج، ولا يُخترع واحد هنا.
 */
function importanceRank(role: PageRole | undefined): number {
  if (role === 'primary') return 0
  if (role === 'excluded') return 2
  return 1
}

/** يقارن بالترتيب الأصلي — أساس ثابت يُحسم به التعادل في بقية الأوجه. */
function compareByOriginal(a: SavedPage, b: SavedPage): number {
  if (a.order !== b.order) return a.order - b.order
  if (a.addedAt !== b.addedAt) return a.addedAt - b.addedAt
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/**
 * يعيد **نسخة** مرتبة. لا تعديل للمصفوفة الأصلية ولا لأي صفحة داخلها.
 *
 * كل وجه يعود عند التعادل إلى الترتيب الأصلي، فلا يظهر ترتيب عشوائي بين
 * صفحتين متساويتين في المعيار المختار.
 */
export function sortPages(
  pages: readonly SavedPage[],
  order: PageSortOrder,
): SavedPage[] {
  const sorted = [...pages]

  switch (order) {
    case 'original':
      return sorted.sort(compareByOriginal)

    case 'added':
      // الأحدث إضافةً أولًا — الاتجاه معلن في نص الواجهة لا مضمَر هنا.
      return sorted.sort((a, b) =>
        a.addedAt !== b.addedAt ? b.addedAt - a.addedAt : compareByOriginal(a, b),
      )

    case 'importance':
      return sorted.sort((a, b) => {
        const rank = importanceRank(a.role) - importanceRank(b.role)
        return rank !== 0 ? rank : compareByOriginal(a, b)
      })
  }
}

// ===== التصفية =====

/** `all` ليست حالة تقدم؛ هي غياب التصفية. لذلك لا تعيش في PAGE_PROGRESS_STATUSES. */
export type PageProgressFilter = 'all' | PageProgressStatus

/**
 * `unclassified` تقابل غياب الدور فعلًا — وغيابه حالة حقيقية معتمدة («لم
 * يُصنَّف بعد»)، لا نقصًا يُخفى: الدور بلا افتراضي عمدًا لأن تصنيف الصفحة حكم
 * المستخدم لا حكم جُسور (دستور المنتج §16).
 */
export type PageRoleFilter = 'all' | PageRole | 'unclassified'

export interface PageFilters {
  progress: PageProgressFilter
  role: PageRoleFilter
  /** الصفحات التي عليها ملاحظات وحدها — §9.4 «وجود ملاحظات». */
  withNotesOnly: boolean
}

export const DEFAULT_PAGE_FILTERS: PageFilters = {
  progress: 'all',
  role: 'all',
  withNotesOnly: false,
}

/** هل المرشِّحات على وضعها الافتراضي؟ أي: هل تُعرض كل الصفحات بلا تصفية. */
export function isDefaultFilters(filters: PageFilters): boolean {
  return (
    filters.progress === DEFAULT_PAGE_FILTERS.progress &&
    filters.role === DEFAULT_PAGE_FILTERS.role &&
    filters.withNotesOnly === DEFAULT_PAGE_FILTERS.withNotesOnly
  )
}

function matchesRole(page: SavedPage, filter: PageRoleFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'unclassified') return page.role === undefined
  return page.role === filter
}

/** يعيد **نسخة** مصفّاة. الصفحات نفسها تُمرَّر بمراجعها بلا أي تعديل. */
export function filterPages(
  pages: readonly SavedPage[],
  filters: PageFilters,
): SavedPage[] {
  return pages.filter((page) => {
    if (filters.progress !== 'all' && page.progressStatus !== filters.progress) return false
    if (!matchesRole(page, filters.role)) return false
    if (filters.withNotesOnly && page.notes.length === 0) return false
    return true
  })
}

// ===== التنظيم الكامل =====

export interface PageOrganization {
  /** كلمات بحث مطبَّعة من `toSearchTerms` — الفارغة تعني «لا بحث». */
  terms: readonly string[]
  filters: PageFilters
  sort: PageSortOrder
}

/**
 * البحث ثم التصفية ثم الترتيب، بهذا التتابع.
 *
 * الترتيب أخيرًا عمدًا: ترتيب ما سيُستبعد عملٌ ضائع، والأهم أن الوجه المختار
 * يصف **ما يراه المستخدم فعلًا** لا القائمة الكاملة قبل التضييق.
 */
export function organizePages(
  pages: readonly SavedPage[],
  organization: PageOrganization,
): SavedPage[] {
  const matched = pages.filter((page) => matchesPage(page, organization.terms))
  return sortPages(filterPages(matched, organization.filters), organization.sort)
}

/** هل التنظيم الحالي يغيّر شيئًا أصلًا؟ يميّز «العرض الكامل» عن «عرض مضيَّق». */
export function isPlainView(organization: PageOrganization): boolean {
  return (
    organization.terms.length === 0 &&
    isDefaultFilters(organization.filters) &&
    organization.sort === DEFAULT_PAGE_SORT
  )
}

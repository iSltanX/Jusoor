/**
 * منشئ السياق — دستور المنتج §9.6 و§9.7 و§9.8.
 *
 * يرتّب بيانات المستخدم في نص واضح **ولا شيء غير ذلك**: لا إرسال، ولا تنفيذ
 * للطلب، ولا اتصال بأي خدمة. توقيع الدوال هنا يجعل ذلك قيدًا بنيويًا لا وعدًا:
 * كلها `(بيانات) => نص`، فلا تملك منفذًا تُرسل عبره شيئًا (§9.6 و§11.2).
 *
 * **الاختصار بتقليل أنواع البيانات لا بإعادة الكتابة.** لا ذكاء اصطناعي، ولا
 * تلخيص، ولا إعادة صياغة — نص المستخدم يخرج كما أدخله حرفيًا. المستويات الثلاثة
 * ليست ثلاث صياغات، بل ثلاث مجموعات من مفاتيح التضمين (§9.6).
 *
 * **العناوين تصل كوسيط لا تُكتب هنا.** `core` لا يعرف نص واجهة ولا لغة (قرار
 * 0005)، فتُمرَّر `ContextLabels` مترجمةً من `i18n`. وهذا بالضبط ما يجعل «لغة
 * عناوين السياق مستقلة عن لغة الواجهة» (§12) تحصيلًا طبيعيًا لا حالة خاصة:
 * المستدعي يختار أي قاموس يمرّر. محتوى المستخدم لا يُترجم أبدًا.
 */

import type { PageProgressStatus, PageRole } from './enums'
import type { SavedPage } from './page'
import type { Workspace } from './workspace'

// ===== المفردات المستقرة =====

/**
 * مستويات العرض الثلاثة (§9.6). رموز إنجليزية ثابتة كبقية مفردات المجال؛
 * ترجمتها في `i18n` — انظر core/enums.ts.
 */
export const CONTEXT_LEVELS = ['brief', 'medium', 'detailed'] as const
export type ContextLevel = (typeof CONTEXT_LEVELS)[number]

/** قوالب الطلب الخمسة (§9.7). نقاط بدء قابلة للتحرير، لا إجابات صحيحة وحيدة. */
export const CONTEXT_TEMPLATES = [
  'research',
  'debug',
  'summarize',
  'compare',
  'continue',
] as const
export type ContextTemplate = (typeof CONTEXT_TEMPLATES)[number]

/** طريقة عرض الروابط (§9.8). */
export const LINK_DISPLAYS = ['title-and-url', 'title-only', 'url-only'] as const
export type LinkDisplay = (typeof LINK_DISPLAYS)[number]

/**
 * أي الملاحظات تُضمَّن.
 *
 * `important` تعني ملاحظات الصفحات الأساسية وحدها — وهي دلالة «المهمة» نفسها
 * المستقرة في المنتج (§9.3 «الصفحات المهمة»، و`important` في ملخص العودة)، لا
 * حكمًا جديدًا يخترعه المنشئ على أهمية ملاحظة بعينها. هكذا يتحقق «أهم الملاحظات»
 * في المستوى المختصر (§9.6) ببنية معروفة للمستخدم، لا بترجيح خفيّ.
 */
export type NotesScope = 'important' | 'all'

// ===== مفاتيح التضمين =====

/** أنواع البيانات التي يختار المستخدم تضمينها — §9.6. */
export interface ContextIncludes {
  goal: boolean
  description: boolean
  generalNote: boolean
  /** آخر ما وصل إليه والخطوة التالية معًا — §7.4 و§7.5 وجها لحظة واحدة. */
  checkpoint: boolean
  pages: boolean
  reasons: boolean
  progress: boolean
  roles: boolean
  notes: boolean
  /** المطلوب الذي يكتبه المستخدم للجهة المستلمة. */
  request: boolean
}

export interface ContextPreset {
  includes: ContextIncludes
  notesScope: NotesScope
}

/**
 * المستويات كإعدادات جاهزة لمفاتيح التضمين.
 *
 * `brief` منقول حرفيًا عن §9.6: «الهدف، والمصادر، وأهم الملاحظات، وآخر ما وصل
 * إليه» — فلا وصف ولا ملاحظة عامة ولا أسباب فتح ولا حالات ولا أدوار.
 * `medium` هو «الإعداد الوسيط الذي تحدده أنواع البيانات المختارة»: نقطة بدء
 * وسطى يعدّلها المستخدم بمفاتيح التضمين نفسها.
 * `detailed` كل ما اختاره بتفاصيله.
 *
 * `request` مفعّل في الثلاثة: المطلوب ليس بيانات مساحة يُختصر بحذفها، بل ما
 * يكتبه المستخدم الآن للجهة المستلمة — ويبقى مع ذلك قابلًا للإطفاء كبقية المفاتيح.
 */
const PRESETS: Record<ContextLevel, ContextPreset> = {
  brief: {
    includes: {
      goal: true,
      description: false,
      generalNote: false,
      checkpoint: true,
      pages: true,
      reasons: false,
      progress: false,
      roles: false,
      notes: true,
      request: true,
    },
    notesScope: 'important',
  },
  medium: {
    includes: {
      goal: true,
      description: true,
      generalNote: true,
      checkpoint: true,
      pages: true,
      reasons: true,
      progress: true,
      roles: false,
      notes: true,
      request: true,
    },
    notesScope: 'all',
  },
  detailed: {
    includes: {
      goal: true,
      description: true,
      generalNote: true,
      checkpoint: true,
      pages: true,
      reasons: true,
      progress: true,
      roles: true,
      notes: true,
      request: true,
    },
    notesScope: 'all',
  },
}

/** يعيد نسخة من إعداد المستوى — فلا يعدّل مستدعٍ الجدولَ الثابت أعلاه. */
export function presetForLevel(level: ContextLevel): ContextPreset {
  const preset = PRESETS[level]
  return { includes: { ...preset.includes }, notesScope: preset.notesScope }
}

// ===== العناوين المترجَمة =====

/**
 * نصوص العناوين ومفردات المنتج، مترجمةً من `i18n`.
 *
 * تشمل قيم حالة التقدم والدور: هذه **مفردات منتج** لا محتوى مستخدم، فتُترجم مع
 * العناوين (§12: «تُترجم العناوين والقالب فقط»).
 */
export interface ContextLabels {
  workspace: string
  request: string
  goal: string
  description: string
  generalNote: string
  lastReached: string
  nextStep: string
  pages: string
  reason: string
  progress: string
  role: string
  notes: string
  /** قالب ترقيم الأجزاء، بمَعلَمَي `{index}` و`{total}` — §9.8. */
  part: string
  progressValues: Record<PageProgressStatus, string>
  roleValues: Record<PageRole, string>
}

// ===== المدخل والمخرج =====

/**
 * صيغة المخرج النصي — دستور المنتج §9.9.
 *
 * كلتاهما **للقراءة والمشاركة**، ولا يلزم أن تكون قابلة لإعادة الاستيراد: عقد
 * النقل هو JSON وحده (docs/decisions/0016-transfer.md). الفرق بينهما شكلي بحت:
 * الأقسام والمحتوى والترتيب واحد، ومحتوى المستخدم يخرج حرفيًا في الاثنتين.
 *
 * نوع مباشر لا قائمة `as const` كبقية المفردات: لا موضع يعدّد الصيغتين وقت
 * التشغيل — شاشة التصدير تعرض ثلاثة خيارات (JSON معهما) من قائمتها الخاصة.
 */
export type ContextFormat = 'text' | 'markdown'

const DEFAULT_CONTEXT_FORMAT: ContextFormat = 'text'

export interface ContextInput {
  workspace: Workspace
  /** الصفحات المختارة بالترتيب الذي يريده المستخدم — لا تُعاد ترتيبها هنا (§9.8). */
  pages: readonly SavedPage[]
  includes: ContextIncludes
  notesScope: NotesScope
  linkDisplay: LinkDisplay
  /** نص المطلوب بعد تحرير المستخدم له — يُدرج حرفيًا بلا إعادة صياغة. */
  request: string
  /** الافتراضي `text` — فلا يتغير مخرج مستدعٍ قائم لم يطلب صيغة. */
  format?: ContextFormat
}

export interface ContextCounts {
  pages: number
  notes: number
  characters: number
  words: number
}

export interface BuiltContext {
  text: string
  counts: ContextCounts
}

// ===== التجميع =====

/** يبني سطر عنوان قسم متبوعًا بمحتواه، أو لا شيء إن كان المحتوى غائبًا. */
function section(
  heading: string,
  body: string | undefined,
  format: ContextFormat,
): string[] {
  if (body === undefined || body.trim() === '') return []
  return format === 'markdown' ? [`## ${heading}`, '', body] : [`${heading}:`, body]
}

/**
 * سطر تفصيل تحت الصفحة.
 *
 * في Markdown قائمة فرعية، وفي النص العادي إزاحة بثلاث مسافات — الشكل وحده
 * يختلف، والمحتوى واحد.
 */
function detailLine(label: string, value: string, format: ContextFormat): string {
  return format === 'markdown' ? `   - ${label}: ${value}` : `   ${label}: ${value}`
}

/** يستبدل `{index}` و`{total}` في قالب ترقيم الأجزاء. */
function formatPart(template: string, index: number, total: number): string {
  return template
    .replace('{index}', String(index))
    .replace('{total}', String(total))
}

/**
 * سطر عنوان الصفحة ورابطها بحسب طريقة العرض المختارة (§9.8).
 *
 * في Markdown يُدمج العنوان والرابط في رابط واحد `[عنوان](رابط)` بدل سطرين —
 * وهو ما يجعل الملف مقروءًا في مستودع أو تطبيق ملاحظات (§9.9).
 */
function pageHeadline(
  page: SavedPage,
  linkDisplay: LinkDisplay,
  position: number,
  format: ContextFormat,
): string[] {
  if (linkDisplay === 'url-only') return [`${position}. ${page.url}`]

  if (linkDisplay === 'title-only') return [`${position}. ${page.title}`]

  return format === 'markdown'
    ? [`${position}. [${page.title}](${page.url})`]
    : [`${position}. ${page.title}`, `   ${page.url}`]
}

/** الملاحظات المضمَّنة لصفحة بعينها بحسب نطاق الملاحظات المختار. */
function notesForPage(page: SavedPage, scope: NotesScope): SavedPage['notes'] {
  if (scope === 'all') return page.notes
  return page.role === 'primary' ? page.notes : []
}

function pageBlock(
  page: SavedPage,
  position: number,
  input: ContextInput,
  labels: ContextLabels,
  format: ContextFormat,
): string[] {
  const { includes, notesScope, linkDisplay } = input
  const lines = pageHeadline(page, linkDisplay, position, format)

  if (includes.reasons && page.reason !== undefined) {
    lines.push(detailLine(labels.reason, page.reason, format))
  }

  // التقدم والدور بعدان مستقلان لا يُدمجان — §7.3 منتج و§10.3 هوية
  if (includes.progress) {
    lines.push(
      detailLine(labels.progress, labels.progressValues[page.progressStatus], format),
    )
  }

  if (includes.roles && page.role !== undefined) {
    lines.push(detailLine(labels.role, labels.roleValues[page.role], format))
  }

  if (includes.notes) {
    for (const note of notesForPage(page, notesScope)) {
      lines.push(detailLine(labels.notes, note.body, format))
    }
  }

  return lines
}

/**
 * يبني نص السياق كاملًا.
 *
 * ترتيب الأقسام مقصود: **المطلوب أولًا** — §9.8 يسميه «المقدمة»، والمقدمة بحكم
 * تعريفها تتصدر؛ ثم هوية المهمة وهدفها، ثم نقطة التوقف والخطوة التالية، ثم
 * الصفحات. فيقرأ المستلم ما هو مطلوب منه قبل تفاصيل قد تكون طويلة.
 */
export function buildContext(input: ContextInput, labels: ContextLabels): BuiltContext {
  const { workspace, pages, includes } = input

  /*
   * اسم المساحة ترويسة هوية لا قسم محتوى: نصٌّ مُلصَق لا يقول لأي مهمة يخص
   * سياقٌ بلا نسب. لذلك يُضاف فوق المحتوى ولا يُعد منه — وسياق لا يحمل إلا
   * اسمًا لا شيء فيه يُنسخ أصلًا، فيُعاد فارغًا صراحةً بدل نص يوهم بمحتوى.
   */
  const format = input.format ?? DEFAULT_CONTEXT_FORMAT
  const blocks: string[][] = []

  if (includes.request) blocks.push(section(labels.request, input.request, format))
  if (includes.goal) blocks.push(section(labels.goal, workspace.goal, format))
  if (includes.description) {
    blocks.push(section(labels.description, workspace.description, format))
  }

  if (includes.checkpoint) {
    blocks.push(section(labels.lastReached, workspace.lastReached, format))
    blocks.push(section(labels.nextStep, workspace.nextStep, format))
  }

  if (includes.generalNote) {
    blocks.push(section(labels.generalNote, workspace.generalNote, format))
  }

  let includedNotes = 0

  if (includes.pages && pages.length > 0) {
    const heading = `${labels.pages} (${pages.length})`
    const pageLines = format === 'markdown' ? [`## ${heading}`, ''] : [`${heading}:`]

    pages.forEach((page, index) => {
      pageLines.push(...pageBlock(page, index + 1, input, labels, format))
      if (includes.notes) includedNotes += notesForPage(page, input.notesScope).length
    })

    blocks.push(pageLines)
  }

  const content = blocks.filter((block) => block.length > 0)

  const identity =
    format === 'markdown'
      ? `# ${labels.workspace}: ${workspace.name}`
      : `${labels.workspace}: ${workspace.name}`

  const text =
    content.length === 0
      ? ''
      : [identity, ...content.map((block) => block.join('\n'))].join('\n\n')

  return {
    text,
    counts: {
      pages: includes.pages ? pages.length : 0,
      notes: includedNotes,
      ...countText(text),
    },
  }
}

// ===== العدّ والتقسيم — §9.8 =====

/** عدّ تقريبي للحروف والكلمات، كما ينص §9.8 على عرضه «تقريبًا». */
export function countText(text: string): { characters: number; words: number } {
  const trimmed = text.trim()
  return {
    characters: text.length,
    words: trimmed === '' ? 0 : trimmed.split(/\s+/).length,
  }
}

/**
 * عتبة اقتراح التقليل أو التقسيم.
 *
 * **ليست حدًّا لأي تطبيق خارجي** — §9.8 ينص صراحةً أن جُسور لا يفترض حدًا ثابتًا
 * لأي تطبيق. هذه عتبة عرض داخلية وحدها: تحت هذا الحجم لا يُزعج المستخدم باقتراح
 * لا يحتاجه، وفوقه يُقترح عليه الاختيار — والاقتراح **لا يمنع** النسخ، تمامًا
 * كعتبة كثرة الصفحات في قرار 0013.
 */
export const LARGE_CONTEXT_CHARACTERS = 8000

export function isLargeContext(counts: ContextCounts): boolean {
  return counts.characters > LARGE_CONTEXT_CHARACTERS
}

/**
 * يقسّم النص إلى أجزاء مرقّمة تحمل اسم المساحة وترتيب الجزء — §9.8.
 *
 * التقسيم على حدود الأسطر لا على عدد الحروف بالضبط: قطع سطر صفحة في منتصفه
 * يُنتج رابطًا مبتورًا أو ملاحظة ناقصة، وهو إفساد للمحتوى لا تقسيم له. لذلك قد
 * يتجاوز جزءٌ الحدَّ قليلًا حين يكون سطر واحد أطول منه أصلًا — وهذا أصدق من بتره.
 */
export function splitContext(
  text: string,
  workspaceName: string,
  partTemplate: string,
  maxCharacters: number = LARGE_CONTEXT_CHARACTERS,
): string[] {
  const lines = text.split('\n')
  const chunks: string[][] = []
  let current: string[] = []
  let size = 0

  for (const line of lines) {
    const lineSize = line.length + 1

    if (current.length > 0 && size + lineSize > maxCharacters) {
      chunks.push(current)
      current = []
      size = 0
    }

    current.push(line)
    size += lineSize
  }

  if (current.length > 0) chunks.push(current)
  if (chunks.length <= 1) return [text]

  return chunks.map(
    (chunk, index) =>
      `${workspaceName} — ${formatPart(partTemplate, index + 1, chunks.length)}\n\n${chunk.join('\n')}`,
  )
}

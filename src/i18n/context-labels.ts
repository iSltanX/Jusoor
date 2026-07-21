/**
 * عناوين النص المنسوخ، مبنيةً للغة يختارها المستخدم **مستقلةً عن لغة الواجهة**
 * — دستور المنتج §12.
 *
 * هذه الوحدة هي الجسر الوحيد بين قاموس `i18n` ومنشئ السياق في `core`: الأخير لا
 * يعرف لغةً ولا نص واجهة (قرار 0005)، فيستقبل العناوين وسيطًا جاهزًا. ونتيجة
 * ذلك أن «عربية أو إنجليزية أو بحسب الواجهة» ليست حالة خاصة في المنشئ، بل مجرد
 * اختيار أي قاموس يُمرَّر إليه.
 *
 * ما يُترجم هنا هو **العناوين ومفردات المنتج** (حالة التقدم والدور) لا غير؛
 * محتوى المستخدم وعناوين المصادر تبقى بلغتها الأصلية دائمًا.
 */

import { createTranslator } from './messages'
import type { ContextLabels, ContextTemplate } from '../core/context-builder'
import { PAGE_PROGRESS_STATUSES, PAGE_ROLES } from '../core/enums'
import type { PageProgressStatus, PageRole } from '../core/enums'
import type { Language } from '../core/settings'

/**
 * لغة عناوين السياق كما يختارها المستخدم.
 * `ui` تتبع لغة الواجهة الحالية، وهي الافتراضي.
 */
export const HEADING_LANGUAGES = ['ui', 'ar', 'en'] as const
export type HeadingLanguagePreference = (typeof HEADING_LANGUAGES)[number]

/** يحسم لغة العناوين الفعلية من التفضيل ولغة الواجهة. */
export function resolveHeadingLanguage(
  preference: HeadingLanguagePreference,
  interfaceLanguage: Language,
): Language {
  return preference === 'ui' ? interfaceLanguage : preference
}

function progressValues(language: Language): Record<PageProgressStatus, string> {
  const t = createTranslator(language)
  return Object.fromEntries(
    PAGE_PROGRESS_STATUSES.map((value) => [value, t(`progress.${value}`)]),
  ) as Record<PageProgressStatus, string>
}

function roleValues(language: Language): Record<PageRole, string> {
  const t = createTranslator(language)
  return Object.fromEntries(
    PAGE_ROLES.map((value) => [value, t(`role.${value}`)]),
  ) as Record<PageRole, string>
}

/** يبني عناوين النص المنسوخ بلغة بعينها. */
export function contextLabels(language: Language): ContextLabels {
  const t = createTranslator(language)

  return {
    workspace: t('contextLabel.workspace'),
    request: t('contextLabel.request'),
    goal: t('contextLabel.goal'),
    description: t('contextLabel.description'),
    generalNote: t('contextLabel.generalNote'),
    lastReached: t('contextLabel.lastReached'),
    nextStep: t('contextLabel.nextStep'),
    pages: t('contextLabel.pages'),
    reason: t('contextLabel.reason'),
    progress: t('contextLabel.progress'),
    role: t('contextLabel.role'),
    notes: t('contextLabel.notes'),
    part: t('contextLabel.part'),
    progressValues: progressValues(language),
    roleValues: roleValues(language),
  }
}

/**
 * نص القالب بلغة العناوين نفسها.
 *
 * القالب جزء ممّا «يُترجم» بنص §12، ويتبع لغة العناوين لا لغة الواجهة: نصٌّ
 * إنجليزي بعناوين إنجليزية يصل متسقًا لمن يُلصق له، ولو كانت الواجهة عربية.
 */
export function contextTemplateText(
  template: ContextTemplate,
  language: Language,
): string {
  return createTranslator(language)(`contextTemplate.${template}`)
}

import { useMemo, useState } from 'react'

import {
  BottomAction,
  Button,
  Checkbox,
  Field,
  PanelHeader,
  ScreenBody,
  SectionHead,
  Segmented,
  SelectField,
  SystemMessage,
} from '../components/identity'
import type { Translate } from '../../i18n/messages'
import { contextLabels } from '../../i18n/context-labels'
import type { Language } from '../../core/settings'
import { LANGUAGES } from '../../core/settings'
import type { Workspace } from '../../core/workspace'
import type { SavedPage } from '../../core/page'
import {
  buildContext,
  CONTEXT_LEVELS,
  CONTEXT_TEMPLATES,
  isLargeContext,
  presetForLevel,
  type ContextIncludes,
  type ContextLevel,
  type ContextTemplate,
} from '../../core/context-builder'
import { exportWorkspace } from '../../app/transfer'
import { writeToClipboard } from '../clipboard'
import { downloadTextFile, isoDateOf, suggestFileName } from '../file-transfer'

/**
 * منشئ السياق — السادسة من الشاشات المرجعية، على بنية `ContextBuilderScreen`
 * في `screens.tsx`: رأس بعودة، ثم «اختر ما تريد تضمينه» مع التصريح الصادق
 * أنه لا ذكاء اصطناعي ولا إرسال، ثم شبكة خيارات التضمين، ثم صف الصيغة
 * (نص · Markdown · JSON)، ثم المعاينة بعدّادها، والإجراءان السفليان
 * «نزّل ملفًا» و«انسخ السياق».
 *
 * القدرات الدستورية فوق بنية النموذج: المستويات الثلاثة (§9.8) وقوالب
 * الطلب الخمسة (§9.7) ولغة العناوين المستقلة (§12) — كلها بمكونات الهوية
 * نفسها. المعاينة تسبق النسخ دائمًا، والاختصار بتقليل أنواع البيانات لا
 * بإعادة الكتابة.
 */
export interface ContextScreenProps {
  workspace: Workspace
  pages: SavedPage[]
  t: Translate
  language: Language
  onBack: () => void
}

type OutputFormat = 'text' | 'markdown' | 'json'

const INCLUDE_KEYS: readonly (keyof ContextIncludes)[] = [
  'goal',
  'description',
  'generalNote',
  'checkpoint',
  'pages',
  'reasons',
  'progress',
  'roles',
  'notes',
  'request',
]

export function ContextScreen({ workspace, pages, t, language, onBack }: ContextScreenProps) {
  const [level, setLevel] = useState<ContextLevel>('medium')
  const [includes, setIncludes] = useState<ContextIncludes>(presetForLevel('medium').includes)
  const [template, setTemplate] = useState<ContextTemplate | 'none'>('none')
  const [request, setRequest] = useState('')
  const [headingLanguage, setHeadingLanguage] = useState<Language>(language)
  const [format, setFormat] = useState<OutputFormat>('markdown')
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const [jsonError, setJsonError] = useState(false)

  const applyLevel = (next: ContextLevel) => {
    setLevel(next)
    setIncludes(presetForLevel(next).includes)
  }

  const applyTemplate = (next: ContextTemplate | 'none') => {
    setTemplate(next)
    if (next !== 'none') setRequest(t(`contextTemplate.${next}`))
  }

  const labels = useMemo(() => contextLabels(headingLanguage), [headingLanguage])

  const built = useMemo(
    () =>
      buildContext(
        {
          workspace,
          pages,
          includes,
          notesScope: presetForLevel(level).notesScope,
          linkDisplay: 'title-and-url',
          request,
          format: format === 'json' ? 'text' : format,
        },
        labels,
      ),
    [workspace, pages, includes, level, request, format, labels],
  )

  const copy = () => {
    setCopied(false)
    setCopyFailed(false)
    void writeToClipboard(built.text).then((done) => {
      if (done) setCopied(true)
      else setCopyFailed(true)
    })
  }

  const download = () => {
    setJsonError(false)
    const stamp = isoDateOf(workspace.updatedAt)

    if (format === 'json') {
      // JSON هو عقد النقل — من مولّد التصدير المعتمد لا من نص المعاينة
      void exportWorkspace(workspace.id).then((result) => {
        if (!result.ok) {
          setJsonError(true)
          return
        }
        downloadTextFile(
          result.value.json,
          suggestFileName(workspace.name, stamp),
          'application/json',
        )
      })
      return
    }

    downloadTextFile(
      built.text,
      `${suggestFileName(workspace.name, stamp).replace(/\.json$/, '')}.${format === 'markdown' ? 'md' : 'txt'}`,
      'text/plain',
    )
  }

  return (
    <>
      <PanelHeader language={language} onBack={onBack} t={t} title={t('context.title')} />

      <ScreenBody>
        <div className="screen-heading">
          <h2>{t('context.pages.choose')}</h2>
          <p>{t('context.body')}</p>
        </div>

        {/* المستويات الثلاثة — الاختصار بتقليل أنواع البيانات (§9.8) */}
        <div className="field">
          <span className="field-label">{t('context.level')}</span>
          <Segmented
            items={CONTEXT_LEVELS.map((candidate) => ({
              value: candidate,
              label: t(`context.level.${candidate}`),
            }))}
            label={t('context.level')}
            onChange={applyLevel}
            value={level}
          />
          <span className="field-meta">
            <small>{t(`context.level.${level}.hint`)}</small>
          </span>
        </div>

        {/* خيارات التضمين — شبكة النموذج المرجعي */}
        <div className="context-options">
          {INCLUDE_KEYS.map((key) => (
            <Checkbox
              checked={includes[key]}
              key={key}
              label={t(`context.include.${key === 'checkpoint' ? 'checkpoint' : key}`)}
              onChange={(checked) => {
                setIncludes({ ...includes, [key]: checked })
              }}
            />
          ))}
        </div>

        {/* قالب الطلب — نقطة بدء قابلة للتحرير لا إجابة وحيدة (§9.7) */}
        <SelectField
          label={t('context.template')}
          onChange={applyTemplate}
          options={[
            { value: 'none', label: t('context.template.none') },
            ...CONTEXT_TEMPLATES.map((candidate) => ({
              value: candidate,
              label: t(`context.template.${candidate}`),
            })),
          ]}
          value={template}
        />

        {includes.request && (
          <Field
            helper={t('context.request.helper')}
            label={t('context.request')}
            onChange={setRequest}
            placeholder={t('context.request.placeholder')}
            textarea
            value={request}
          />
        )}

        {/* لغة العناوين مستقلة عن لغة الواجهة — §12 */}
        <SelectField
          label={t('context.headingLanguage')}
          onChange={setHeadingLanguage}
          options={LANGUAGES.map((candidate) => ({
            value: candidate,
            label: t(`settings.language.${candidate}`),
          }))}
          value={headingLanguage}
        />

        {/* صف الصيغة المرجعي */}
        <div className="field format-row">
          <span className="field-label">{t('transfer.format')}</span>
          <Segmented
            items={[
              { value: 'text', label: t('transfer.format.text') },
              { value: 'markdown', label: t('transfer.format.markdown') },
              { value: 'json', label: t('transfer.format.json') },
            ]}
            label={t('transfer.format')}
            onChange={setFormat}
            value={format}
          />
        </div>

        {format === 'json' && (
          <p className="reason-line">
            <span>
              <small>{t('transfer.format.json.hint')}</small>
            </span>
          </p>
        )}

        {/* المعاينة تسبق النسخ دائمًا — §9.8 */}
        <section className="context-preview">
          <SectionHead
            meta={t('context.counts', {
              pages: built.counts.pages,
              characters: built.counts.characters,
            })}
            title={t('context.preview')}
          />
          {format === 'json' ? (
            <p className="reason-line">
              <span>
                <small>{t('transfer.format.json.hint')}</small>
              </span>
            </p>
          ) : built.text.trim() === '' ? (
            <p className="reason-line">
              <span>{t('context.preview.empty')}</span>
            </p>
          ) : (
            <pre dir="auto">{built.text}</pre>
          )}
        </section>

        {isLargeContext(built.counts) && (
          <SystemMessage detail={t('context.large.body')} kind="banner" title={t('context.large.title')} />
        )}

        {copied && <SystemMessage kind="toast" title={t('context.copied')} />}
        {copyFailed && (
          <SystemMessage
            detail={t('context.copy.failed.body')}
            kind="error"
            title={t('context.copy.failed.title')}
          />
        )}
        {jsonError && (
          <SystemMessage
            detail={t('transfer.export.error.body')}
            kind="error"
            title={t('transfer.export.error.title')}
          />
        )}

        {/* تنبيه الخصوصية قبل النسخ — §11.2 */}
        <SystemMessage detail={t('context.privacy.body')} kind="alert" title={t('context.privacy.title')} />
      </ScreenBody>

      <BottomAction>
        <Button icon="export" onClick={download} size="lg" variant="secondary">
          {t('transfer.export.download')}
        </Button>
        <Button disabled={format === 'json'} icon="copy" onClick={copy} size="lg">
          {t('context.copy')}
        </Button>
      </BottomAction>
    </>
  )
}

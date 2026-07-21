import { useRef, useState } from 'react'

import { Icon } from './icons'
import {
  BottomAction,
  Button,
  PanelHeader,
  ScreenBody,
  SectionHead,
  SystemMessage,
} from './components/identity'
import type { Translate, MessageKey } from '../i18n/messages'
import type { Language } from '../core/settings'
import {
  applyImport,
  inspectImport,
  IMPORT_RESOLUTIONS,
  type ImportPreview,
  type ImportResolution,
} from '../app/transfer'
import { readTextFile } from './file-transfer'

/**
 * استيراد البيانات — دورة §9.10 على مكونات الهوية: اختيار الملف، فالتحقق
 * الصارم قبل أي كتابة، فعرض التعارض بخياراته الأربعة الصريحة (إنشاء نسخة،
 * استبدال، دمج الصفحات غير المكررة، إلغاء)، فالتطبيق الذرّي.
 *
 * الملف مدخل غير موثوق: الرفض يظهر بأسبابه المنظمة، ولا ثقة تلقائية.
 */
export interface ImportScreenProps {
  t: Translate
  language: Language
  onDone: () => void
  onBack: () => void
}

type Phase =
  | { name: 'choose' }
  | { name: 'reading' }
  | { name: 'rejected'; reason: MessageKey }
  | { name: 'preview'; raw: string; preview: ImportPreview }
  | { name: 'applying'; raw: string; preview: ImportPreview }
  | { name: 'done'; imported: number; skipped: number }
  | { name: 'failed' }

export function ImportScreen({ t, language, onDone, onBack }: ImportScreenProps) {
  const [phase, setPhase] = useState<Phase>({ name: 'choose' })
  const [resolution, setResolution] = useState<ImportResolution>('create-copy')
  const inputRef = useRef<HTMLInputElement>(null)

  const inspect = (raw: string) => {
    void inspectImport(raw).then((result) => {
      if (!result.ok) {
        setPhase({
          name: 'rejected',
          reason:
            'rejection' in result
              ? (`transfer.reject.${result.rejection.reason}` as MessageKey)
              : 'transfer.reject.unreadable',
        })
        return
      }
      setPhase({ name: 'preview', raw, preview: result.value })
    })
  }

  const apply = (raw: string, preview: ImportPreview) => {
    setPhase({ name: 'applying', raw, preview })
    void applyImport({ envelope: preview.envelope, resolution }).then((result) => {
      if (!result.ok) {
        setPhase({ name: 'failed' })
        return
      }
      setPhase({
        name: 'done',
        imported: result.value.imported,
        skipped: result.value.skipped,
      })
    })
  }

  return (
    <>
      <PanelHeader language={language} onBack={onBack} t={t} title={t('transfer.import.title')} />

      <ScreenBody>
        <div className="screen-heading">
          <h2>{t('transfer.import.title')}</h2>
          <p>{t('transfer.import.body')}</p>
        </div>

        {(phase.name === 'choose' || phase.name === 'rejected') && (
          <>
            <input
              accept="application/json,.json"
              aria-label={t('transfer.import.choose')}
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file === undefined) return
                setPhase({ name: 'reading' })
                void readTextFile(file).then((raw) => {
                  if (raw === undefined) {
                    setPhase({ name: 'rejected', reason: 'transfer.reject.unreadable' })
                    return
                  }
                  inspect(raw)
                })
                event.target.value = ''
              }}
              ref={inputRef}
              type="file"
            />
            <div>
              <Button
                icon="import"
                onClick={() => {
                  inputRef.current?.click()
                }}
                variant="secondary"
              >
                {t('transfer.import.choose')}
              </Button>
            </div>

            {phase.name === 'rejected' && (
              <SystemMessage detail={t(phase.reason)} kind="error" title={t('transfer.reject.title')} />
            )}
          </>
        )}

        {phase.name === 'reading' && (
          <p className="screen-heading" role="status">
            <span>{t('transfer.import.reading')}</span>
          </p>
        )}

        {(phase.name === 'preview' || phase.name === 'applying') && (
          <>
            <SystemMessage
              detail={t('transfer.import.summary', {
                workspaces: phase.preview.workspaces,
                pages: phase.preview.pages,
              })}
              kind="alert"
              title={t('transfer.import.title')}
            />

            {phase.preview.conflicts.length === 0 ? (
              <p className="reason-line">
                <Icon name="success" size={14} />
                <span>{t('transfer.import.noConflicts')}</span>
              </p>
            ) : (
              <section className="panel-section">
                <SectionHead
                  meta={phase.preview.conflicts.length}
                  title={t('transfer.import.conflicts.title')}
                />
                <p className="reason-line">
                  <span>
                    <small>{t('transfer.import.conflicts.body')}</small>
                  </span>
                </p>

                {/* الخيارات الأربعة الصريحة — §9.10 */}
                <div className="field">
                  <span className="field-label">{t('transfer.import.resolution')}</span>
                  {IMPORT_RESOLUTIONS.map((candidate) => (
                    <label className="check-row" key={candidate}>
                      <input
                        checked={resolution === candidate}
                        name="resolution"
                        onChange={() => {
                          setResolution(candidate)
                        }}
                        type="radio"
                      />
                      <span>
                        <Icon name="check" size={12} />
                      </span>
                      {t(`transfer.import.resolution.${candidate}`)}
                    </label>
                  ))}
                  <span className="field-meta">
                    <small>{t(`transfer.import.resolution.${resolution}.hint`)}</small>
                  </span>
                </div>
              </section>
            )}
          </>
        )}

        {phase.name === 'done' && (
          <SystemMessage
            detail={t('transfer.import.done.body', { count: phase.imported })}
            kind="toast"
            title={t('transfer.import.done.title')}
          />
        )}

        {phase.name === 'failed' && (
          <SystemMessage
            detail={t('transfer.import.failed.body')}
            kind="error"
            title={t('transfer.import.failed.title')}
          />
        )}
      </ScreenBody>

      <BottomAction>
        {(phase.name === 'preview' || phase.name === 'applying') && (
          <Button
            disabled={phase.name === 'applying' || (phase.preview.conflicts.length > 0 && resolution === 'cancel')}
            icon="import"
            loading={phase.name === 'applying'}
            onClick={() => {
              if (phase.name === 'preview') apply(phase.raw, phase.preview)
            }}
            size="lg"
          >
            {phase.name === 'applying' ? t('transfer.import.applying') : t('transfer.import.apply')}
          </Button>
        )}
        {phase.name === 'done' ? (
          <Button onClick={onDone} size="lg">
            {t('action.done')}
          </Button>
        ) : (
          <Button onClick={onBack} size="lg" variant="secondary">
            {t('action.back')}
          </Button>
        )}
      </BottomAction>
    </>
  )
}

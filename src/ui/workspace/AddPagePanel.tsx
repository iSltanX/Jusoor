import { useState } from 'react'

import { Icon } from '../icons'
import {
  BottomAction,
  Button,
  Field,
  PanelHeader,
  ScreenBody,
  SiteFavicon,
  SystemMessage,
} from '../components/identity'
import { domainOf } from './PageCard'
import type { Translate, MessageKey } from '../../i18n/messages'
import type { Language } from '../../core/settings'
import type { SavedPage } from '../../core/page'
import { inspectCurrentTab } from '../../app/workspace-session'
import { requestTabsPermission } from '../../app/permissions'
import type { ApplicationErrorCode } from '../../app/errors'
import { classifyPageUrl } from '../../core/page-link'

/**
 * إضافة صفحة — مساران: قراءة الصفحة المفتوحة عبر `activeTab` بعد نقر صريح
 * (قرار 0012: محاولة القراءة أولًا ثم عرض منح `tabs` الاختيارية عند التعذر)،
 * أو إدخال يدوي بالرابط والعنوان.
 *
 * اكتشاف التكرار يعرض الخيارات الدستورية (§9.5): فتح النسخة الحالية، أو
 * إضافة نسخة أخرى، أو تحديث بياناتها — لا حذف ولا دمج تلقائي.
 */
export interface AddPagePanelProps {
  t: Translate
  language: Language
  saving: boolean
  duplicates: SavedPage[] | undefined
  onSubmit: (input: { title: string; url: string; allowDuplicate: boolean }) => void
  onUpdateExisting: (page: SavedPage, title: string) => void
  onGoToExisting: (page: SavedPage) => void
  onCancel: () => void
}

function captureMessage(error: ApplicationErrorCode): MessageKey {
  if (error.kind !== 'browser-capture') return 'addPage.capture.apiError'
  if (error.reason === 'no-suitable-tab') return 'addPage.capture.noTab'
  if (error.reason === 'api-error') return 'addPage.capture.apiError'
  return error.detail === 'missing-title'
    ? 'addPage.capture.missingTitle'
    : 'addPage.capture.missingUrl'
}

export function AddPagePanel({
  t,
  language,
  saving,
  duplicates,
  onSubmit,
  onUpdateExisting,
  onGoToExisting,
  onCancel,
}: AddPagePanelProps) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [reading, setReading] = useState(false)
  const [captureError, setCaptureError] = useState<MessageKey | undefined>(undefined)
  const [urlError, setUrlError] = useState(false)

  const readCurrent = () => {
    setReading(true)
    setCaptureError(undefined)

    void inspectCurrentTab().then((result) => {
      setReading(false)
      if (!result.ok) {
        setCaptureError(captureMessage(result.error))
        return
      }
      setTitle(result.value.title)
      setUrl(result.value.url)
    })
  }

  const submit = (allowDuplicate: boolean) => {
    const trimmedUrl = url.trim()
    const trimmedTitle = title.trim()
    if (trimmedUrl === '' || trimmedTitle === '') {
      setUrlError(true)
      return
    }
    setUrlError(false)
    onSubmit({ title: trimmedTitle, url: trimmedUrl, allowDuplicate })
  }

  const linkKind = url.trim() === '' ? undefined : classifyPageUrl(url.trim())

  return (
    <>
      <PanelHeader language={language} onBack={onCancel} t={t} title={t('addPage.title')} />

      <ScreenBody>
        {/* التكرار المكتشف — القرار للمستخدم، لا يُحفظ شيء تلقائيًا */}
        {duplicates !== undefined && duplicates.length > 0 ? (
          <>
            <SystemMessage
              detail={t('duplicate.body', { count: duplicates.length })}
              kind="banner"
              title={t('duplicate.title')}
            />

            {duplicates.map((page) => (
              <article className="page-card" key={page.id}>
                <div className="page-card-main">
                  <SiteFavicon domain={domainOf(page.url)} />
                  <span className="page-card-title">
                    <h4>
                      <bdi>{page.title}</bdi>
                    </h4>
                    <span>{domainOf(page.url)}</span>
                  </span>
                </div>
                <div className="dialog-actions">
                  <Button
                    onClick={() => {
                      onGoToExisting(page)
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    {t('duplicate.goToExisting')}
                  </Button>
                  <Button
                    disabled={saving}
                    onClick={() => {
                      onUpdateExisting(page, title.trim() === '' ? page.title : title.trim())
                    }}
                    size="sm"
                    variant="secondary"
                  >
                    {t('duplicate.updateExisting')}
                  </Button>
                </div>
              </article>
            ))}

            <div>
              <Button
                disabled={saving}
                icon="plus"
                onClick={() => {
                  submit(true)
                }}
                size="sm"
                variant="secondary"
              >
                {t('duplicate.addCopy')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="screen-heading">
              <h2>{t('addPage.title')}</h2>
              <p>{t('addPage.manual')}</p>
            </div>

            {/* قراءة الصفحة المفتوحة — الفعل الصريح الذي يمنح activeTab */}
            <div>
              <Button
                disabled={reading}
                icon="page"
                loading={reading}
                onClick={readCurrent}
                variant="secondary"
              >
                {t('addPage.readCurrent')}
              </Button>
            </div>

            {captureError !== undefined && (
              <>
                <SystemMessage
                  detail={t(captureError)}
                  kind="banner"
                  title={t('addPage.capture.title')}
                />
                <div>
                  <Button
                    onClick={() => {
                      void requestTabsPermission().then((result) => {
                        if (result.granted) readCurrent()
                      })
                    }}
                    size="sm"
                    variant="secondary"
                  >
                    {t('addPage.capture.grant')}
                  </Button>
                </div>
              </>
            )}

            <Field
              label={t('page.title')}
              onChange={setTitle}
              value={title}
            />

            <Field
              error={urlError ? t('addPage.url.helper') : undefined}
              helper={t('addPage.url.helper')}
              label={t('page.url')}
              onChange={setUrl}
              type="url"
              value={url}
            />

            {/* صدق التصنيف: رابط داخلي أو غير http يُحفظ لكنه قد لا يُفتح */}
            {linkKind !== undefined && linkKind !== 'http' && (
              <p className="reason-line">
                <Icon name="info" size={14} />
                <span>
                  <small>{t('addPage.linkKind.title')}</small> {t('addPage.linkKind.body')}
                </span>
              </p>
            )}
          </>
        )}
      </ScreenBody>

      {duplicates === undefined || duplicates.length === 0 ? (
        <BottomAction>
          <Button
            disabled={saving}
            icon="plus"
            loading={saving}
            onClick={() => {
              submit(false)
            }}
            size="lg"
          >
            {t('addPage.submit')}
          </Button>
        </BottomAction>
      ) : (
        <BottomAction>
          <Button onClick={onCancel} size="lg" variant="secondary">
            {t('duplicates.back')}
          </Button>
        </BottomAction>
      )}
    </>
  )
}

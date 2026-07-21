import { useState } from 'react'

import { Icon } from '../icons'
import {
  BottomAction,
  Button,
  JusoorMark,
  PanelHeader,
  RestoreNotice,
  ScreenBody,
  SectionHead,
  SiteFavicon,
  SystemMessage,
} from '../components/identity'
import { domainOf } from './PageCard'
import type { Translate } from '../../i18n/messages'
import type { Language } from '../../core/settings'
import type { SavedPageId } from '../../core/ids'
import type { PageOpenResult, ReturnSummary } from '../../app/workspace-session'

/**
 * شاشة العودة — الخامسة من الشاشات المرجعية وأهم لحظة في المنتج، على بنية
 * `ReturnScreen` في `screens.tsx` وبالترتيب الملزم (§10.3 هوية):
 *
 *   1. «عُد إلى حيث توقفت» مع الرمز ووقت تجميد المساحة.
 *   2. «آخر ما وصلت إليه» — لا يُقص (§7.3 هوية).
 *   3. «الخطوة التالية» بطاقة البؤرة العنبرية مع إجراء الصفحة الأساسية.
 *   4. «ما بقي» — الصفحات المتبقية باختيار صريح لما يُفتح (§9.3 منتج).
 *   5. «نتيجة الاستعادة» — أعداد صادقة وتفسير لما تعذر.
 *   6. «متابعة العمل» الإجراء الأساسي في الأسفل.
 *
 * لا يُفتح شيء تلقائيًا، ولا تُعرض نتيجة فتح التبويب بوصفها استعادة موضع.
 */
export interface ReturnScreenProps {
  summary: ReturnSummary
  t: Translate
  language: Language
  opening: boolean
  results: PageOpenResult[] | undefined
  onRestore: (pageIds: SavedPageId[]) => void
  onSkip: () => void
  onContinue: () => void
}

/** عتبة التحذير من كثرة الصفحات — قرار 0013، ولا تمنع الفتح. */
const MANY_PAGES = 10

function frozenSince(workedAt: number, now: number, language: Language): string {
  const hours = Math.max(0, Math.floor((now - workedAt) / 3_600_000))
  const formatter = new Intl.RelativeTimeFormat(language, { numeric: 'auto' })
  if (hours < 24) return formatter.format(-hours, 'hour')
  return formatter.format(-Math.floor(hours / 24), 'day')
}

export function ReturnScreen({
  summary,
  t,
  language,
  opening,
  results,
  onRestore,
  onSkip,
  onContinue,
}: ReturnScreenProps) {
  const { workspace, pages, remaining, important, loadedAt } = summary
  const [selected, setSelected] = useState<ReadonlySet<SavedPageId>>(
    new Set(remaining.map((page) => page.id)),
  )

  const toggle = (pageId: SavedPageId) => {
    const next = new Set(selected)
    if (!next.delete(pageId)) next.add(pageId)
    setSelected(next)
  }

  /** الصفحة الأساسية لإجراء الخطوة التالية: أول مهمة، وإلا أول متبقية. */
  const primaryPage = important[0] ?? remaining[0] ?? pages[0]

  const opened = results?.filter((result) => result.status === 'opened').length ?? 0
  const unavailable = results === undefined ? 0 : results.length - opened

  return (
    <>
      <PanelHeader
        actions={
          <span className="privacy-chip">
            <Icon name="lock" size={12} />
            {t('home.local')}
          </span>
        }
        language={language}
        t={t}
        title={t('return.title')}
      />

      <ScreenBody className="return-screen">
        {/* 1 — التحية ووقت التجميد */}
        <div className="return-greeting">
          <JusoorMark size={52} />
          <div>
            <h1>{t('home.intro')}</h1>
            <p>
              {t('return.frozenAt', {
                time: frozenSince(workspace.frozenAt ?? workspace.lastWorkedAt, loadedAt, language),
              })}
            </p>
          </div>
        </div>

        {/* 2 — آخر ما وصلت إليه: لا يُقص */}
        <section className="last-checkpoint">
          <span>
            <Icon name="checkpoint" size={20} />
          </span>
          <div>
            <small>{t('workspace.lastReached')}</small>
            <h3>
              {workspace.lastReached !== undefined ? (
                <bdi>{workspace.lastReached}</bdi>
              ) : (
                t('workspace.checkpoint.empty')
              )}
            </h3>
            {workspace.generalNote !== undefined && (
              <p>
                <bdi>{workspace.generalNote}</bdi>
              </p>
            )}
          </div>
        </section>

        {/* 3 — الخطوة التالية: البؤرة العنبرية الوحيدة */}
        {workspace.nextStep !== undefined && (
          <section className="next-action-card">
            <div className="next-action-top">
              <Icon name="next" size={20} />
              <span>{t('workspace.nextStep')}</span>
            </div>
            <h2>
              <bdi>{workspace.nextStep}</bdi>
            </h2>
            {primaryPage !== undefined && results === undefined && (
              <a
                className="button primary md"
                href={primaryPage.url}
                rel="noreferrer"
                target="_blank"
                title={primaryPage.title}
              >
                <Icon name="external" size={16} />
                <span>{t('return.next.open')}</span>
              </a>
            )}
          </section>
        )}

        {/* 4 — ما بقي: اختيار صريح لما يُفتح */}
        {results === undefined && (
          <section className="unfinished-pages">
            <SectionHead meta={remaining.length} title={t('return.remaining')} />

            {remaining.length === 0 && (
              <p className="reason-line">
                <Icon name="success" size={14} />
                <span>{t('return.remaining.none')}</span>
              </p>
            )}

            {remaining.map((page) => (
              <div key={page.id}>
                <label className="check-row">
                  <input
                    checked={selected.has(page.id)}
                    onChange={() => {
                      toggle(page.id)
                    }}
                    type="checkbox"
                  />
                  <span>
                    <Icon name="check" size={12} />
                  </span>
                </label>
                <SiteFavicon domain={domainOf(page.url)} />
                <span className="row-copy">
                  <strong>
                    <bdi>{page.title}</bdi>
                  </strong>
                  <small>
                    {t(`progress.${page.progressStatus}`)}
                    {page.role !== undefined && ` · ${t(`role.${page.role}`)}`}
                  </small>
                </span>
              </div>
            ))}

            {remaining.length > 0 && (
              <div className="dialog-actions">
                <Button
                  onClick={() => {
                    setSelected(new Set(pages.map((page) => page.id)))
                  }}
                  size="sm"
                  variant="ghost"
                >
                  {t('return.selectAll')}
                </Button>
                <Button
                  disabled={opening || selected.size === 0}
                  icon="restore"
                  loading={opening}
                  onClick={() => {
                    onRestore([...selected])
                  }}
                  size="sm"
                  variant="secondary"
                >
                  {opening ? t('return.opening') : t('return.open')}
                </Button>
              </div>
            )}

            {selected.size > MANY_PAGES && (
              <SystemMessage
                detail={t('return.many.body', { count: selected.size })}
                kind="banner"
                title={t('return.many.title')}
              />
            )}
          </section>
        )}

        {/* 5 — نتيجة الاستعادة: أعداد صادقة وتفسير */}
        {results !== undefined && (
          <section className="restore-summary">
            <SectionHead
              meta={t('directory.pages', { count: results.length })}
              title={t('return.result.title')}
            />

            <div className="summary-strip">
              <span className="opened">
                <b>{opened}</b>
                {t('return.count.opened')}
              </span>
              <span className="unavailable">
                <b>{unavailable}</b>
                {t('return.count.unavailable')}
              </span>
              <span className="pending">
                <b>{pages.length - results.length}</b>
                {t('return.count.notRequested')}
              </span>
            </div>

            {results.map((result) => (
              <div className="unfinished-pages" key={result.pageId}>
                <div>
                  <Icon name="page" size={16} />
                  <span className="row-copy">
                    <strong>
                      <bdi>{result.title}</bdi>
                    </strong>
                  </span>
                  <RestoreNotice compact state={result.status} t={t} />
                </div>
              </div>
            ))}

            {/* صدق §13.3: فتح تبويب ليس استعادة موضع قراءة */}
            <p>
              <Icon name="info" size={14} />
              {t('return.result.note')}
            </p>
          </section>
        )}
      </ScreenBody>

      {/* 6 — متابعة العمل */}
      <BottomAction>
        {results === undefined && (
          <Button onClick={onSkip} size="lg" variant="secondary">
            {t('return.skip')}
          </Button>
        )}
        <Button icon="restore" onClick={results === undefined ? onSkip : onContinue} size="lg">
          {t('return.continue.work')}
        </Button>
      </BottomAction>
    </>
  )
}

import type { KeyboardEvent, MouseEvent } from 'react'

import { Icon } from '../icons'
import { ProgressBadge, RoleTag, SiteFavicon, type FaviconTone } from '../components/identity'
import type { Translate } from '../../i18n/messages'
import type { Language } from '../../core/settings'
import type { PageNote, SavedPage } from '../../core/page'

/**
 * بطاقة الصفحة المرجعية — `PageCard` من `ui.tsx` ببنيتها وترتيبها: هوية
 * الموقع بنغمتها، فالعنوان والنطاق، فبُعدا التصنيف، فسبب الفتح، فشريط
 * البيانات الوصفية، ثم الجزء الموسع (آخر ملاحظة فعلية + الإجراءات).
 *
 * التفاعل: البطاقة كلها قابلة للتوسيع بالنقر على مساحتها غير التفاعلية،
 * وزر chevron هو المشغل الدلالي للوحة المفاتيح (`aria-expanded/controls`).
 * الأفعال الداخلية (فتح، تفاصيل) توقف الانتشار فلا تطوي البطاقة خطأً.
 * لا زر داخل زر: البطاقة article والمشغل زر مستقل.
 */
export interface PageCardProps {
  page: SavedPage
  t: Translate
  language: Language
  expanded: boolean
  onToggle: () => void
  onOpenDetails: () => void
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

/** هل الرابط ملف PDF؟ قاعدة مستقرة على المسار لا تخمين بصري. */
export function isPdfUrl(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith('.pdf')
  } catch {
    return url.toLowerCase().endsWith('.pdf')
  }
}

/** نطاقات المصادر التطويرية — قائمة صغيرة مستقرة، لا توزيع لوني عشوائي. */
const CODE_HOSTS = ['github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com']

function isCodeHost(domain: string): boolean {
  const host = domain.replace(/^www\./, '')
  return CODE_HOSTS.some((candidate) => host === candidate || host.endsWith(`.${candidate}`))
}

/**
 * نغمة هوية الموقع بقواعد ثابتة مفهومة، بالأولوية:
 * 1) PDF → `paper` (وثيقة). 2) دور «تحتاج تحققًا» → `question` — حكم المستخدم
 * نفسه لا تخمين. 3) مضيف تطويري معروف → `code`. 4) وإلا → `brand`.
 */
export function faviconTone(page: Pick<SavedPage, 'url' | 'role'>): FaviconTone {
  if (isPdfUrl(page.url)) return 'paper'
  if (page.role === 'verify') return 'question'
  if (isCodeHost(domainOf(page.url))) return 'code'
  return 'brand'
}

/** أحدث ملاحظة فعليًا بوقت آخر تعديل — لا أول القائمة ولا آخرها موقعيًا. */
export function latestNote(notes: readonly PageNote[]): PageNote | undefined {
  return notes.reduce<PageNote | undefined>(
    (latest, note) =>
      latest === undefined || note.updatedAt > latest.updatedAt ? note : latest,
    undefined,
  )
}

function formatStamp(timestamp: number, language: Language): string {
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(timestamp)
}

export function PageCard({ page, t, language, expanded, onToggle, onOpenDetails }: PageCardProps) {
  const domain = domainOf(page.url)
  const pdf = isPdfUrl(page.url)
  const note = latestNote(page.notes)
  const regionId = `page-expanded-${page.id}`

  /** توسيع بالنقر على المساحة غير التفاعلية وحدها — الأفعال الداخلية مستقلة. */
  const onCardClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('a, button, input, textarea, select') !== null) return
    onToggle()
  }

  const onCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onToggle()
    }
  }

  return (
    <article
      className={`page-card ${expanded ? 'expanded' : ''}`.trim()}
      onClick={onCardClick}
      onKeyDown={onCardKeyDown}
    >
      <div className="page-card-main">
        <SiteFavicon domain={domain} tone={faviconTone(page)} />
        <span className="page-card-title">
          <h4>
            <bdi>{page.title}</bdi>
          </h4>
          <span>
            {domain}
            {pdf && ` · ${t('page.pdf')}`}
          </span>
        </span>
        {/* المشغل الدلالي للوحة المفاتيح — chevron يعكس حالة الإفصاح */}
        <button
          aria-controls={regionId}
          aria-expanded={expanded}
          aria-label={`${t('pageCard.toggle')}: ${page.title}`}
          className="button ghost sm icon-only card-chevron"
          onClick={(event) => {
            event.stopPropagation()
            onToggle()
          }}
          type="button"
        >
          <Icon
            className={`disclosure-chevron ${expanded ? 'open' : ''}`.trim()}
            name="chevron"
            size={16}
          />
        </button>
      </div>

      <div className="page-taxonomy">
        <ProgressBadge state={page.progressStatus} t={t} />
        {page.role !== undefined && <RoleTag role={page.role} t={t} />}
      </div>

      {page.reason !== undefined && (
        <p className="reason-line">
          <Icon name="reason" size={14} />
          <span>
            <small>{t('page.reason')}: </small>
            <bdi>{page.reason}</bdi>
          </span>
        </p>
      )}

      <div className="page-meta">
        {page.notes.length > 0 && (
          <span>
            <Icon name="note" size={14} />
            {page.notes.length}
          </span>
        )}
        <span>
          <Icon name="clock" size={14} />
          {formatStamp(page.updatedAt, language)}
        </span>
      </div>

      {expanded && (
        <div className="page-expanded" id={regionId}>
          {note !== undefined && (
            <p>
              <strong>{t('pageCard.latestNote')}</strong>
              <bdi>{note.body}</bdi>
              <small>{formatStamp(note.updatedAt, language)}</small>
            </p>
          )}
          <div className="dialog-actions">
            <a
              className="button secondary sm"
              href={page.url}
              onClick={(event) => {
                event.stopPropagation()
              }}
              rel="noreferrer"
              target="_blank"
            >
              <Icon name="external" size={16} />
              <span>{t('page.open')}</span>
            </a>
            <button
              className="button text sm"
              onClick={(event) => {
                event.stopPropagation()
                onOpenDetails()
              }}
              type="button"
            >
              <span>{t('pageCard.details')}</span>
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

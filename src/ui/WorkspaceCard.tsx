import { Icon, type IconName } from './icons'
import { Button, Stat } from './components/identity'
import type { Translate } from '../i18n/messages'
import type { Language } from '../core/settings'
import type { WorkspaceSummary } from '../app/workspace-session'
import type { WorkspaceTemplate } from '../core/enums'

/**
 * بطاقة المساحة المرجعية — `WorkspaceCard` من `ui.tsx` ببنيتها الكاملة:
 * سطر علوي (شارة القالب)، الاسم والهدف، سطر «آخر ما وصلت إليه»، سطر «الخطوة
 * التالية» بالبؤرة العنبرية، العدادات وآخر نشاط، ثم تذييل الحالة والإجراء
 * الأساسي «افتح المساحة»/«استعد المساحة».
 *
 * كل عنصر يظهر عند توفر بيانه الفعلي: غياب الخطوة التالية يعرض سطر
 * «لا توجد خطوة تالية بعد» المرجعي لا فراغًا صامتًا.
 */
export interface WorkspaceCardProps {
  summary: WorkspaceSummary
  t: Translate
  language: Language
  now: number
  isLast: boolean
  onOpen: () => void
}

export const TEMPLATE_ICONS: Record<WorkspaceTemplate, IconName> = {
  general: 'general',
  research: 'research',
  development: 'code',
}

/** صياغة «منذ متى» بوحدات كاملة عبر بيانات المنطقة — لا نصوص عدد مركبة يدويًا. */
export function formatRelativeWork(workedAt: number, now: number, language: Language): string {
  const minutes = Math.floor((now - workedAt) / 60_000)
  const formatter = new Intl.RelativeTimeFormat(language, { numeric: 'auto' })

  if (minutes < 1) return formatter.format(0, 'minute')
  if (minutes < 60) return formatter.format(-minutes, 'minute')

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return formatter.format(-hours, 'hour')

  return formatter.format(-Math.floor(hours / 24), 'day')
}

export function WorkspaceCard({ summary, t, language, now, isLast, onOpen }: WorkspaceCardProps) {
  const { workspace, pageCount } = summary
  const frozen = workspace.status === 'frozen'

  return (
    <article className={`workspace-card ${workspace.status}`}>
      <div className="card-topline">
        <span className="template-chip">
          <Icon name={TEMPLATE_ICONS[workspace.template]} size={12} />
          {t(`template.${workspace.template}`)}
        </span>
        {isLast && <span className="template-chip">{t('directory.lastUsed')}</span>}
      </div>

      <div>
        <h4>
          <bdi>{workspace.name}</bdi>
        </h4>
        {workspace.goal !== undefined && (
          <p className="card-goal clamp-2">
            <bdi>{workspace.goal}</bdi>
          </p>
        )}
      </div>

      {workspace.lastReached !== undefined && (
        <div className="checkpoint-line">
          <Icon name="checkpoint" size={16} />
          <div>
            <small>{t('workspace.lastReached')}</small>
            <span>
              <bdi>{workspace.lastReached}</bdi>
            </span>
          </div>
        </div>
      )}

      {workspace.nextStep !== undefined ? (
        <div className="next-line">
          <Icon name="next" size={16} />
          <div>
            <small>{t('workspace.nextStep')}</small>
            <strong>
              <bdi>{workspace.nextStep}</bdi>
            </strong>
          </div>
        </div>
      ) : (
        <div className="missing-context">
          <Icon name="next" size={16} />
          <span>{t('card.missingNext')}</span>
        </div>
      )}

      <div className="card-stats">
        <Stat label={t('card.pages')} value={pageCount} />
        <span className="activity">
          <Icon name="clock" size={12} />
          {formatRelativeWork(workspace.lastWorkedAt, now, language)}
        </span>
      </div>

      <div className="card-footer">
        <span className={`workspace-state ${workspace.status}`}>
          {t(`status.${workspace.status}`)}
        </span>
        <Button
          icon={frozen ? 'restore' : 'arrow'}
          mirrorIcon={!frozen && language === 'ar'}
          onClick={onOpen}
          size="sm"
        >
          {frozen ? t('card.restore') : t('card.open')}
        </Button>
      </div>
    </article>
  )
}

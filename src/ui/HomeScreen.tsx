import { useState } from 'react'

import { Icon } from './icons'
import {
  BottomAction,
  Button,
  EmptyState,
  IconButton,
  PanelHeader,
  ScreenBody,
  SectionHead,
  Segmented,
  SystemMessage,
} from './components/identity'
import { WorkspaceCard } from './WorkspaceCard'
import type { Translate } from '../i18n/messages'
import type { Language } from '../core/settings'
import type { WorkspaceDirectory as Directory, WorkspaceSummary } from '../app/workspace-session'
import type { WorkspaceId } from '../core/ids'
import { matchesWorkspace, toSearchTerms } from '../core/search'

/**
 * شاشة المساحات — الأولى من الشاشات المرجعية الثماني، على بنية `HomeScreen`
 * في `screens.tsx` المرجعي: رأس مدمج بالرمز واسم الشاشة وأيقونتي البحث
 * والإعدادات، ثم السطر التوجيهي مع مؤشر التخزين المحلي، ثم مرشحات الحالة
 * بأعدادها، ثم «متابعة العمل» ببطاقات المساحات المرجعية، والإجراء الأساسي
 * «إنشاء مساحة» في المنطقة السفلية.
 *
 * الترتيب بالأحدث عملًا يأتي محسوبًا من طبقة app؛ البحث والمرشحات تضييق
 * عرض خالص فلا كتابة ولا رفع لـ lastWorkedAt.
 */
export interface HomeScreenProps {
  directory: Directory
  t: Translate
  language: Language
  onCreate: () => void
  onOpen: (id: WorkspaceId) => void
  onOpenSettings: () => void
}

type StatusFilter = 'all' | 'active' | 'frozen'

function matchesFilter(summary: WorkspaceSummary, filter: StatusFilter): boolean {
  if (filter === 'all') return true
  return summary.workspace.status === filter
}

export function HomeScreen({
  directory,
  t,
  language,
  onCreate,
  onOpen,
  onOpenSettings,
}: HomeScreenProps) {
  const { summaries, corruptedCount, lastWorkspaceId, loadedAt } = directory
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  const isEmpty = summaries.length === 0 && corruptedCount === 0

  const terms = toSearchTerms(query)
  const searching = searchOpen && terms.length > 0
  const visible = summaries
    .filter((summary) => matchesFilter(summary, filter))
    .filter((summary) => !searching || matchesWorkspace(summary.workspace, terms))

  const countOf = (status: StatusFilter) =>
    summaries.filter((summary) => matchesFilter(summary, status)).length

  return (
    <>
      <PanelHeader
        actions={
          <>
            {summaries.length > 0 && (
              <IconButton
                icon="search"
                label={t('directory.search')}
                language={language}
                onClick={() => {
                  setSearchOpen((open) => !open)
                  setQuery('')
                }}
              />
            )}
            <IconButton
              icon="settings"
              label={t('settings.title')}
              language={language}
              onClick={onOpenSettings}
            />
          </>
        }
        language={language}
        t={t}
        title={t('directory.title')}
      />

      <ScreenBody>
        {isEmpty ? (
          <EmptyState
            action={t('empty.action')}
            detail={t('empty.body')}
            icon="workspace"
            onAction={onCreate}
            title={t('empty.title')}
          />
        ) : (
          <>
            {/* السطر التوجيهي ومؤشر التخزين المحلي — HomeScreen المرجعية */}
            <div className="intro-line">
              <div>
                <h2>{t('home.intro')}</h2>
                <p>{t('home.intro.body')}</p>
              </div>
              <span className="privacy-chip">
                <Icon name="lock" size={12} />
                {t('home.local')}
              </span>
            </div>

            {searchOpen && (
              <label className="search-field">
                <Icon name="search" size={16} />
                <input
                  aria-label={t('directory.search')}
                  onChange={(event) => {
                    setQuery(event.target.value)
                  }}
                  placeholder={t('directory.search.placeholder')}
                  type="search"
                  value={query}
                />
              </label>
            )}

            <Segmented
              items={[
                { value: 'all', label: t('home.filter.all'), count: countOf('all') },
                { value: 'active', label: t('status.active'), count: countOf('active') },
                { value: 'frozen', label: t('status.frozen'), count: countOf('frozen') },
              ]}
              label={t('home.filter.label')}
              onChange={setFilter}
              value={filter}
            />

            <section className="panel-section">
              <SectionHead
                meta={searching ? t('directory.search.results', { count: visible.length, total: summaries.length }) : visible.length}
                title={t('home.continue')}
              />

              {visible.length === 0 ? (
                <>
                  <SystemMessage
                    kind="alert"
                    title={searching ? t('directory.search.none.title') : t('home.filter.none')}
                    detail={searching ? t('directory.search.none.body') : undefined}
                  />
                  {searching && (
                    <div>
                      <Button
                        onClick={() => {
                          setQuery('')
                        }}
                        size="sm"
                        variant="secondary"
                      >
                        {t('directory.search.clear')}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                visible.map((summary) => (
                  <WorkspaceCard
                    isLast={summary.workspace.id === lastWorkspaceId}
                    key={summary.workspace.id}
                    language={language}
                    now={loadedAt}
                    onOpen={() => {
                      onOpen(summary.workspace.id)
                    }}
                    summary={summary}
                    t={t}
                  />
                ))
              )}
            </section>
          </>
        )}

        {/* السجلات التالفة لا تختفي صامتة، ولا يُعرض محتواها */}
        {corruptedCount > 0 && (
          <SystemMessage
            detail={t('directory.corrupted.body', { count: corruptedCount })}
            kind="error"
            title={t('directory.corrupted.title')}
          />
        )}
      </ScreenBody>

      <BottomAction>
        <Button icon="plus" onClick={onCreate} size="lg">
          {t('home.create')}
        </Button>
      </BottomAction>
    </>
  )
}

import { useCallback, useEffect, useState } from 'react'

import { Icon } from '../icons'
import {
  BottomAction,
  Button,
  ConfirmDialog,
  Field,
  JusoorMark,
  PanelHeader,
  ScreenBody,
  SectionHead,
  SelectField,
  SystemMessage,
} from '../components/identity'
import { TEMPLATE_ICONS } from '../WorkspaceCard'
import { PageCard } from './PageCard'
import { PageDetail } from './PageDetail'
import { AddPagePanel } from './AddPagePanel'
import { FreezePanel } from './FreezePanel'
import { ReturnScreen } from './ReturnScreen'
import { ContextScreen } from './ContextScreen'
import type { Translate } from '../../i18n/messages'
import type { Language } from '../../core/settings'
import type { SavedPage } from '../../core/page'
import type { PageNoteId, SavedPageId, WorkspaceId } from '../../core/ids'
import {
  deleteWorkspaceNow,
  editPageNote,
  freezeWorkspaceNow,
  loadReturnSummary,
  openWorkspace,
  removePageFromWorkspace,
  removePageNote,
  restoreWorkspace,
  savePageFields,
  savePageNote,
  savePageToWorkspace,
  saveCheckpoint,
  type FreezeWorkspaceOutcome,
  type PageOpenResult,
  type ReturnSummary,
  type WorkspaceView,
} from '../../app/workspace-session'
import { matchesPage, toSearchTerms } from '../../core/search'
import {
  DEFAULT_PAGE_FILTERS,
  DEFAULT_PAGE_SORT,
  organizePages,
  PAGE_SORT_ORDERS,
  type PageFilters,
  type PageRoleFilter,
  type PageSortOrder,
} from '../../core/page-organization'
import { PAGE_ROLES } from '../../core/enums'

/**
 * داخل المساحة — الثالثة من الشاشات المرجعية، على بنية `WorkspaceScreen`
 * في `screens.tsx`: رأس باسم المساحة وعودة وأيقونة منشئ السياق، ثم hero
 * (شارة القالب والهدف وملخص الأعداد)، ثم زوج السياق (آخر ما وصلت إليه
 * والخطوة التالية بالبؤرة العنبرية)، ثم البحث والمرشحات، ثم بطاقات الصفحات
 * المرجعية، والإجراءان «جمّد المساحة» و«تابع الخطوة» في المنطقة السفلية.
 *
 * الشاشة حاوية أيضًا: تفاصيل الصفحة، الإضافة، التجميد، العودة، ومنشئ السياق
 * تُفتح منها وتعود إليها — التنقل حالة داخلية بلا Router.
 */
export interface WorkspaceScreenProps {
  workspaceId: WorkspaceId
  t: Translate
  language: Language
  onBack: () => void
}

type Screen =
  | { name: 'loading' }
  | { name: 'error' }
  | { name: 'return'; summary: ReturnSummary; opening: boolean; results?: PageOpenResult[] }
  | { name: 'overview' }
  | { name: 'page'; pageId: SavedPageId }
  | { name: 'add-page'; duplicates?: SavedPage[] }
  | { name: 'freeze' }
  | { name: 'frozen'; outcome: FreezeWorkspaceOutcome }
  | { name: 'context' }

/** ترتيب متباعد يترك فراغًا للإدراج بين صفحتين دون إعادة ترقيم الكل. */
const ORDER_STEP = 1024

type ProgressChip = 'all' | 'in-progress'

export function WorkspaceScreen({ workspaceId, t, language, onBack }: WorkspaceScreenProps) {
  const [view, setView] = useState<WorkspaceView | undefined>(undefined)
  const [screen, setScreen] = useState<Screen>({ name: 'loading' })
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteFailed, setDeleteFailed] = useState(false)

  // تحرير نقطة التوقف — إفصاح موضعي فوق الزوج لا شاشة مستقلة
  const [editingCheckpoint, setEditingCheckpoint] = useState(false)
  const [lastReached, setLastReached] = useState('')
  const [nextStep, setNextStep] = useState('')

  // تنظيم عرض الصفحات — §9.4: حالة عرض محضة لا تُحفظ ولا تغيّر أي بيان
  const [query, setQuery] = useState('')
  const [progressChip, setProgressChip] = useState<ProgressChip>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [roleFilter, setRoleFilter] = useState<PageRoleFilter>('all')
  const [sort, setSort] = useState<PageSortOrder>(DEFAULT_PAGE_SORT)
  const [expandedPage, setExpandedPage] = useState<SavedPageId | undefined>(undefined)

  const applyView = useCallback((loaded: WorkspaceView) => {
    setView(loaded)
    setLastReached(loaded.workspace.lastReached ?? '')
    setNextStep(loaded.workspace.nextStep ?? '')
  }, [])

  /** المساحة المجمدة تُفتح على شاشة العودة أولًا — §10.3 هوية. */
  useEffect(() => {
    let active = true

    void openWorkspace(workspaceId).then((result) => {
      if (!active) return
      if (!result.ok) {
        setScreen({ name: 'error' })
        return
      }
      applyView(result.value)

      if (result.value.workspace.status !== 'frozen') {
        setScreen({ name: 'overview' })
        return
      }

      void loadReturnSummary(workspaceId).then((summary) => {
        if (!active) return
        setScreen(
          summary.ok
            ? { name: 'return', summary: summary.value, opening: false }
            : { name: 'overview' },
        )
      })
    })

    return () => {
      active = false
    }
  }, [workspaceId, applyView])

  const runSave = useCallback(
    (operation: () => Promise<{ ok: boolean }>, after?: () => void) => {
      setSaving(true)
      setSaveFailed(false)

      void operation().then((result) => {
        if (!result.ok) {
          setSaving(false)
          setSaveFailed(true)
          return
        }

        void openWorkspace(workspaceId).then((reloaded) => {
          setSaving(false)
          if (reloaded.ok) applyView(reloaded.value)
          after?.()
        })
      })
    },
    [workspaceId, applyView],
  )

  if (screen.name === 'loading') {
    return (
      <>
        <PanelHeader language={language} onBack={onBack} t={t} title={t('panel.loading')} />
        <ScreenBody>
          <p className="screen-heading" role="status">
            <span>{t('panel.loading')}</span>
          </p>
        </ScreenBody>
      </>
    )
  }

  if (screen.name === 'error' || view === undefined) {
    return (
      <>
        <PanelHeader language={language} onBack={onBack} t={t} title={t('workspace.error.title')} />
        <ScreenBody>
          <SystemMessage detail={t('workspace.error.body')} kind="error" title={t('workspace.error.title')} />
        </ScreenBody>
        <BottomAction>
          <Button onClick={onBack} size="lg">
            {t('workspace.back')}
          </Button>
        </BottomAction>
      </>
    )
  }

  const { workspace, pages, corruptedPages } = view

  // ===== شاشة العودة =====
  if (screen.name === 'return') {
    const { summary, opening, results } = screen

    return (
      <ReturnScreen
        language={language}
        onContinue={() => {
          void openWorkspace(workspaceId).then((reloaded) => {
            if (reloaded.ok) applyView(reloaded.value)
            setScreen({ name: 'overview' })
          })
        }}
        onRestore={(pageIds) => {
          setScreen({ name: 'return', summary, opening: true })

          void restoreWorkspace({ workspaceId, pageIds }).then((result) => {
            if (!result.ok) {
              setSaveFailed(true)
              setScreen({ name: 'return', summary, opening: false })
              return
            }
            setScreen({
              name: 'return',
              summary,
              opening: false,
              results: result.value.results,
            })
          })
        }}
        onSkip={() => {
          setScreen({ name: 'overview' })
        }}
        opening={opening}
        results={results}
        summary={summary}
        t={t}
      />
    )
  }

  // ===== التجميد =====
  if (screen.name === 'freeze') {
    return (
      <FreezePanel
        language={language}
        onCancel={() => {
          setScreen({ name: 'overview' })
        }}
        onFreeze={(input) => {
          setSaving(true)
          setSaveFailed(false)

          void freezeWorkspaceNow({ workspaceId, ...input }).then((result) => {
            setSaving(false)
            if (!result.ok) {
              setSaveFailed(true)
              return
            }
            setScreen({ name: 'frozen', outcome: result.value })
          })
        }}
        saving={saving}
        t={t}
        workspace={workspace}
      />
    )
  }

  if (screen.name === 'frozen') {
    const { outcome } = screen

    return (
      <>
        <PanelHeader language={language} t={t} title={t('freeze.done.title')} />
        <ScreenBody>
          {/* صدق: التجميد تم، والإغلاق قد لا يكون تم — يُفصل الأمران */}
          {outcome.needsTabsPermission ? (
            <SystemMessage
              detail={t('freeze.done.notClosed.body')}
              kind="banner"
              title={t('freeze.done.notClosed.title')}
            />
          ) : outcome.closeFailed ? (
            <SystemMessage
              detail={t('freeze.done.closeFailed.body')}
              kind="banner"
              title={t('freeze.done.notClosed.title')}
            />
          ) : (
            <SystemMessage
              detail={t('freeze.done.closed', { count: outcome.closedTabs })}
              kind="alert"
              title={t('freeze.done.title')}
            />
          )}
        </ScreenBody>
        <BottomAction>
          <Button onClick={onBack} size="lg">
            {t('workspace.back')}
          </Button>
        </BottomAction>
      </>
    )
  }

  // ===== منشئ السياق =====
  if (screen.name === 'context') {
    return (
      <ContextScreen
        language={language}
        onBack={() => {
          setScreen({ name: 'overview' })
        }}
        pages={pages}
        t={t}
        workspace={workspace}
      />
    )
  }

  // ===== تفاصيل صفحة =====
  if (screen.name === 'page') {
    const page = pages.find((candidate) => candidate.id === screen.pageId)

    if (page === undefined) {
      setScreen({ name: 'overview' })
      return null
    }

    return (
      <PageDetail
        key={page.id}
        language={language}
        onAddNote={(body) => {
          runSave(() => savePageNote(page.id, body))
        }}
        onBack={() => {
          setScreen({ name: 'overview' })
        }}
        onDeleteNote={(noteId: PageNoteId) => {
          runSave(() => removePageNote(page.id, noteId))
        }}
        onRemovePage={() => {
          runSave(
            () => removePageFromWorkspace(page.id),
            () => {
              setScreen({ name: 'overview' })
            },
          )
        }}
        onEditNote={(noteId: PageNoteId, body) => {
          runSave(() => editPageNote(page.id, noteId, body))
        }}
        onSaveFields={(patch) => {
          runSave(() => savePageFields(page.id, patch))
        }}
        page={page}
        saving={saving}
        t={t}
      />
    )
  }

  // ===== إضافة صفحة =====
  if (screen.name === 'add-page') {
    return (
      <AddPagePanel
        duplicates={screen.duplicates}
        language={language}
        onCancel={() => {
          setScreen({ name: 'overview' })
        }}
        onGoToExisting={(page) => {
          setScreen({ name: 'page', pageId: page.id })
        }}
        onSubmit={({ title, url, allowDuplicate }) => {
          setSaving(true)
          setSaveFailed(false)

          void savePageToWorkspace({
            workspaceId,
            title,
            url,
            order: (pages.length + 1) * ORDER_STEP,
            ...(allowDuplicate ? { mode: 'add-new-copy' as const } : {}),
          }).then((result) => {
            setSaving(false)

            if (!result.ok) {
              setSaveFailed(true)
              return
            }

            if (result.value.needsUserDecision) {
              setScreen({ name: 'add-page', duplicates: result.value.matches })
              return
            }

            void openWorkspace(workspaceId).then((reloaded) => {
              if (reloaded.ok) applyView(reloaded.value)
              setScreen({ name: 'overview' })
            })
          })
        }}
        onUpdateExisting={(page, title) => {
          runSave(
            () => savePageFields(page.id, { title }),
            () => {
              setScreen({ name: 'page', pageId: page.id })
            },
          )
        }}
        saving={saving}
        t={t}
      />
    )
  }

  // ===== نظرة عامة =====

  const terms = toSearchTerms(query)
  const filters: PageFilters = {
    ...DEFAULT_PAGE_FILTERS,
    progress: progressChip === 'in-progress' ? 'in-progress' : 'all',
    role: roleFilter,
  }
  const organization = { terms: [], filters, sort }
  const visiblePages = organizePages(pages, organization).filter(
    (page) => terms.length === 0 || matchesPage(page, terms),
  )

  const inProgressCount = pages.filter((page) => page.progressStatus === 'in-progress').length
  const notesCount = pages.reduce((total, page) => total + page.notes.length, 0)
  const unfinishedCount = pages.filter((page) => page.progressStatus !== 'complete').length

  /**
   * هدف «تابع الخطوة» و«ابدأ»: التبويب النشط المحفوظ أولًا، ثم الصفحة
   * الأساسية غير المكتملة، ثم أي غير مكتملة، ثم الأولى — لا فتح عشوائيًا
   * لأول صفحة ما دامت أساسية محددة.
   */
  const continueTarget =
    pages.find((page) => page.id === workspace.activePageId) ??
    pages.find((page) => page.role === 'primary' && page.progressStatus !== 'complete') ??
    pages.find((page) => page.progressStatus !== 'complete') ??
    pages[0]

  const narrowed = terms.length > 0 || progressChip !== 'all' || roleFilter !== 'all'

  return (
    <>
      <PanelHeader
        actions={
          <span className="tooltip-wrap" data-tooltip={t('context.open')}>
            {/* رمز جُسور الرسمي (أصل الحزمة، لا ينعكس في RTL) + تسمية الإجراء */}
            <button
              aria-label={t('context.open')}
              className="button ghost sm context-chip"
              onClick={() => {
                setScreen({ name: 'context' })
              }}
              type="button"
            >
              <JusoorMark size={16} />
              <span>{t('context.builder.short')}</span>
            </button>
          </span>
        }
        language={language}
        onBack={onBack}
        t={t}
        title={workspace.name}
      />

      <ScreenBody>
        {/* hero — شارة القالب والحالة والهدف وملخص الأعداد */}
        <div className="workspace-hero">
          <div className="card-topline">
            <span className="template-chip">
              <Icon name={TEMPLATE_ICONS[workspace.template]} size={12} />
              {t(`template.${workspace.template}`)}
            </span>
            <span className={`workspace-state ${workspace.status}`}>
              {t(`status.${workspace.status}`)}
            </span>
          </div>
          {workspace.goal !== undefined && (
            <p>
              <bdi>{workspace.goal}</bdi>
            </p>
          )}
          <div className="workspace-summary">
            <span>
              <b>{pages.length}</b>
              {t('card.pages')}
            </span>
            <span>
              <b>{unfinishedCount}</b>
              {t('card.unfinished')}
            </span>
            <span>
              <b>{notesCount}</b>
              {t('ws.notes')}
            </span>
          </div>
        </div>

        {saveFailed && (
          <SystemMessage
            detail={t('workspace.saveFailed.body')}
            kind="error"
            title={t('workspace.saveFailed.title')}
          />
        )}

        {/* زوج السياق — نقطة التوقف ثم الخطوة التالية بالبؤرة العنبرية */}
        <div className="context-pair">
          {/* البطاقة كلها زر إفصاح: النقر على أي جزء يفتح المحرر (§10.5) */}
          <button
            aria-controls="checkpoint-editor"
            aria-expanded={editingCheckpoint}
            onClick={() => {
              setEditingCheckpoint((open) => !open)
            }}
            type="button"
          >
            <Icon name="checkpoint" size={18} />
            <span className="pair-copy">
              <small>{t('workspace.lastReached')}</small>
              <strong>
                {workspace.lastReached !== undefined ? (
                  <bdi>{workspace.lastReached}</bdi>
                ) : (
                  t('workspace.checkpoint.empty')
                )}
              </strong>
            </span>
            <Icon
              className={`disclosure-chevron ${editingCheckpoint ? 'open' : ''}`.trim()}
              name="chevron"
              size={16}
            />
          </button>
          <div className="next">
            <Icon name="next" size={18} />
            <span className="pair-copy">
              <small>{t('workspace.nextStep')}</small>
              <strong>
                {workspace.nextStep !== undefined ? (
                  <bdi>{workspace.nextStep}</bdi>
                ) : (
                  t('card.missingNext')
                )}
              </strong>
            </span>
            {continueTarget !== undefined && workspace.nextStep !== undefined && (
              <a
                className="button primary sm"
                href={continueTarget.url}
                rel="noreferrer"
                target="_blank"
                title={continueTarget.title}
              >
                <Icon name="external" size={16} />
                <span>{t('ws.start')}</span>
              </a>
            )}
          </div>
        </div>

        {editingCheckpoint && (
          <div className="panel-section checkpoint-editor" id="checkpoint-editor">
            <Field
              label={t('workspace.lastReached')}
              onChange={setLastReached}
              placeholder={t('workspace.lastReached.placeholder')}
              textarea
              value={lastReached}
            />
            <Field
              label={t('workspace.nextStep')}
              onChange={setNextStep}
              placeholder={t('workspace.nextStep.placeholder')}
              textarea
              value={nextStep}
            />
            <div className="dialog-actions">
              <Button
                onClick={() => {
                  setEditingCheckpoint(false)
                }}
                size="sm"
                variant="ghost"
              >
                {t('form.cancel')}
              </Button>
              <Button
                disabled={saving}
                onClick={() => {
                  runSave(
                    () => saveCheckpoint(workspaceId, { lastReached, nextStep }),
                    () => {
                      setEditingCheckpoint(false)
                    },
                  )
                }}
                size="sm"
              >
                {saving ? t('action.saving') : t('action.save')}
              </Button>
            </div>
          </div>
        )}

        {/* البحث داخل المساحة والمرشحات — §9.4 */}
        {pages.length > 0 && (
          <>
            <label className="search-field">
              <Icon name="search" size={16} />
              <input
                aria-label={t('workspace.pages.search')}
                onChange={(event) => {
                  setQuery(event.target.value)
                }}
                placeholder={t('workspace.pages.search.placeholder')}
                type="search"
                value={query}
              />
            </label>

            <div className="filter-row">
              <button
                className={progressChip === 'all' ? 'active' : ''}
                onClick={() => {
                  setProgressChip('all')
                }}
                type="button"
              >
                {t('home.filter.all')} <span>{pages.length}</span>
              </button>
              <button
                className={progressChip === 'in-progress' ? 'active' : ''}
                onClick={() => {
                  setProgressChip('in-progress')
                }}
                type="button"
              >
                {t('progress.in-progress')} <span>{inProgressCount}</span>
              </button>
              <button
                aria-expanded={filtersOpen}
                className={filtersOpen || roleFilter !== 'all' || sort !== DEFAULT_PAGE_SORT ? 'active' : ''}
                onClick={() => {
                  setFiltersOpen((open) => !open)
                }}
                type="button"
              >
                <Icon name="filter" size={14} />
                {t('filter.label')}
              </button>
            </div>

            {filtersOpen && (
              <div className="taxonomy-fields">
                <SelectField
                  label={t('filter.role')}
                  onChange={setRoleFilter}
                  options={[
                    { value: 'all', label: t('home.filter.all') },
                    ...PAGE_ROLES.map((role) => ({ value: role, label: t(`role.${role}`) })),
                    { value: 'unclassified', label: t('page.role.none') },
                  ]}
                  value={roleFilter}
                />
                <SelectField
                  label={t('sort.label')}
                  onChange={setSort}
                  options={PAGE_SORT_ORDERS.map((order) => ({
                    value: order,
                    label: t(`sort.${order}`),
                  }))}
                  value={sort}
                />
              </div>
            )}
          </>
        )}

        {/* الصفحات — بطاقات الصفحة المرجعية بالإفصاح التدريجي */}
        <section className="panel-section pages-list">
          <SectionHead
            action={
              <Button
                icon="plus"
                onClick={() => {
                  setScreen({ name: 'add-page' })
                }}
                size="sm"
                variant="text"
              >
                {t('workspace.pages.add')}
              </Button>
            }
            meta={
              narrowed
                ? t('workspace.pages.shown', { count: visiblePages.length, total: pages.length })
                : pages.length
            }
            title={t('workspace.pages.title')}
          />

          {pages.length === 0 && (
            <p className="screen-heading">
              <span>{t('workspace.pages.empty')}</span>
            </p>
          )}

          {pages.length > 0 && visiblePages.length === 0 && (
            <>
              <SystemMessage
                detail={t('workspace.pages.none.body')}
                kind="alert"
                title={t('workspace.pages.none.title')}
              />
              <div>
                <Button
                  onClick={() => {
                    setQuery('')
                    setProgressChip('all')
                    setRoleFilter('all')
                    setSort(DEFAULT_PAGE_SORT)
                  }}
                  size="sm"
                  variant="secondary"
                >
                  {t('workspace.pages.showAll')}
                </Button>
              </div>
            </>
          )}

          {visiblePages.map((page) => (
            <PageCard
              expanded={expandedPage === page.id}
              key={page.id}
              language={language}
              onOpenDetails={() => {
                setScreen({ name: 'page', pageId: page.id })
              }}
              onToggle={() => {
                setExpandedPage(expandedPage === page.id ? undefined : page.id)
              }}
              page={page}
              t={t}
            />
          ))}
        </section>

        {corruptedPages.length > 0 && (
          <SystemMessage
            detail={t('workspace.corrupted.body', { count: corruptedPages.length })}
            kind="error"
            title={t('workspace.corrupted.title')}
          />
        )}

        {deleteFailed && (
          <SystemMessage
            detail={t('delete.failed.body')}
            kind="error"
            title={t('delete.failed.title')}
          />
        )}

        {/* منطقة الخطر — حذف المساحة نهائيًا بتأكيد تدميري (قرار 0018) */}
        <div className="danger-zone">
          <Button
            disabled={saving}
            icon="trash"
            onClick={() => {
              setConfirmingDelete(true)
            }}
            size="sm"
            variant="danger"
          >
            {t('workspace.delete')}
          </Button>
          <small>{t('workspace.delete.hint')}</small>
        </div>
      </ScreenBody>

      <BottomAction>
        {workspace.status === 'active' && (
          <Button
            icon="freeze"
            onClick={() => {
              setScreen({ name: 'freeze' })
            }}
            size="lg"
            variant="secondary"
          >
            {t('freeze.action')}
          </Button>
        )}
        {continueTarget !== undefined ? (
          <a
            className="button primary lg"
            href={continueTarget.url}
            rel="noreferrer"
            target="_blank"
            title={continueTarget.title}
          >
            <Icon name="next" size={20} />
            <span>{t('ws.continueNext')}</span>
          </a>
        ) : (
          <Button
            icon="plus"
            onClick={() => {
              setScreen({ name: 'add-page' })
            }}
            size="lg"
          >
            {t('workspace.pages.add')}
          </Button>
        )}
      </BottomAction>

      {confirmingDelete && (
        <ConfirmDialog
          body={t('workspace.delete.confirm.body', {
            pages: pages.length,
            notes: notesCount,
          })}
          cancelLabel={t('form.cancel')}
          confirmLabel={t('workspace.delete')}
          onCancel={() => {
            setConfirmingDelete(false)
          }}
          onConfirm={() => {
            setConfirmingDelete(false)
            setDeleteFailed(false)
            void deleteWorkspaceNow(workspaceId).then((result) => {
              if (!result.ok) {
                // فشل التخزين: البيانات باقية والرسالة صادقة — لا نجاح كاذبًا
                setDeleteFailed(true)
                return
              }
              onBack()
            })
          }}
          title={t('workspace.delete.confirm.title')}
        />
      )}
    </>
  )
}

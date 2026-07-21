import { useCallback, useEffect, useState } from 'react'

import { Icon } from './icons'
import {
  BottomAction,
  Button,
  Checkbox,
  EmptyState,
  Field,
  IconButton,
  JusoorMark,
  PanelHeader,
  ScreenBody,
  SiteFavicon,
  SystemMessage,
} from './components/identity'
import { TEMPLATE_ICONS } from './WorkspaceCard'
import type { Translate } from '../i18n/messages'
import type { Language } from '../core/settings'
import type { Workspace } from '../core/workspace'
import { WORKSPACE_TEMPLATES, type WorkspaceTemplate } from '../core/enums'
import type { WindowTabsPreview } from '../app/workspace-creation'
import {
  createWorkspaceFromSelectedTabs,
  loadWindowTabs,
} from '../app/workspace-creation'
import { createEmptyWorkspace } from '../app/workspace-session'
import { requestTabsPermission } from '../app/permissions'
import type { BrowserTabSnapshot } from '../core/browser-tab'

/**
 * معالج إنشاء المساحة — الثانية من الشاشات المرجعية، على بنية `CreateScreen`
 * في `screens.tsx`: رأس «مساحة جديدة» بزر عودة وإلغاء، مؤشر خطوات مرقّم
 * 1–2–3 بخط فاصل، ثم ثلاث خطوات: الهوية (الاسم والقالب والهدف)، واختيار
 * الصفحات من تبويبات النافذة، ومراجعة ما سيُحفظ، والإجراء الأساسي ثابت أسفل.
 *
 * الربط الفعلي: `loadWindowTabs` مع مسار صلاحية `tabs` الاختيارية الصريح
 * (قرار 0004)، والإنشاء عبر `createWorkspaceFromSelectedTabs` أو
 * `createEmptyWorkspace` حين لا صفحات — الخطوة الثانية اختيارية بنص المنتج
 * (دستور المنتج §8.3: لا إجبار على غير الاسم).
 */
export interface CreateWizardProps {
  t: Translate
  language: Language
  onCancel: () => void
  onCreated: (workspace: Workspace) => void
}

type Step = 1 | 2 | 3

type TabsState =
  | { name: 'loading' }
  | { name: 'permission-needed' }
  | { name: 'error' }
  | { name: 'ready'; preview: WindowTabsPreview }

const GOAL_LIMIT = 240

export function CreateWizard({ t, language, onCancel, onCreated }: CreateWizardProps) {
  const [step, setStep] = useState<Step>(1)
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [template, setTemplate] = useState<WorkspaceTemplate>('general')
  const [nameError, setNameError] = useState(false)

  const [tabsState, setTabsState] = useState<TabsState>({ name: 'loading' })
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const [allowDuplicates, setAllowDuplicates] = useState(false)
  const [duplicateCount, setDuplicateCount] = useState<number | undefined>(undefined)

  const refreshTabs = useCallback(() => {
    void loadWindowTabs().then((result) => {
      if (!result.ok) {
        setTabsState({ name: 'error' })
        return
      }
      if (result.value.needsPermission) {
        setTabsState({ name: 'permission-needed' })
        return
      }
      setTabsState({ name: 'ready', preview: result.value })
      // البدء بتحديد الكل — قرار المستخدم يبقى قابلاً للعكس فورًا
      setSelected(new Set(result.value.usable.map((tab) => tab.index)))
    })
  }, [])

  useEffect(() => {
    let active = true

    void loadWindowTabs().then((result) => {
      if (!active) return
      if (!result.ok) {
        setTabsState({ name: 'error' })
        return
      }
      if (result.value.needsPermission) {
        setTabsState({ name: 'permission-needed' })
        return
      }
      setTabsState({ name: 'ready', preview: result.value })
      setSelected(new Set(result.value.usable.map((tab) => tab.index)))
    })

    return () => {
      active = false
    }
  }, [])

  const usable: BrowserTabSnapshot[] = tabsState.name === 'ready' ? tabsState.preview.usable : []
  const selectedTabs = usable.filter((tab) => selected.has(tab.index))

  const toggleTab = (index: number) => {
    const next = new Set(selected)
    if (!next.delete(index)) next.add(index)
    setSelected(next)
    setDuplicateCount(undefined)
    setAllowDuplicates(false)
  }

  const goNext = () => {
    if (step === 1) {
      if (name.trim() === '') {
        setNameError(true)
        return
      }
      setNameError(false)
      setStep(2)
      return
    }
    if (step === 2) {
      setStep(3)
    }
  }

  const create = () => {
    setSaving(true)
    setFailed(false)

    const workspace = {
      name: name.trim(),
      template,
      ...(goal.trim() === '' ? {} : { goal: goal.trim() }),
    }

    if (selectedTabs.length === 0) {
      void createEmptyWorkspace(workspace).then((result) => {
        setSaving(false)
        if (!result.ok) {
          setFailed(true)
          return
        }
        onCreated(result.value)
      })
      return
    }

    void createWorkspaceFromSelectedTabs({
      workspace,
      selectedTabs,
      ...(allowDuplicates ? { allowDuplicateTabs: true } : {}),
    }).then((result) => {
      setSaving(false)
      if (!result.ok) {
        setFailed(true)
        return
      }
      if (!result.value.created) {
        // تكرار مكتشف: لا يُحفظ شيء تلقائيًا — القرار للمستخدم (§9.5)
        setDuplicateCount(result.value.duplicates.length)
        return
      }
      onCreated(result.value.workspace)
    })
  }

  return (
    <>
      {/*
        التنقل: X يلغي الإنشاء ويخرج؛ سهم الرأس يرجع خطوة واحدة ولا يظهر في
        الخطوة الأولى (لا تكرار لوظيفة X)، ولا زر «سابق» سفليًا — الشريط
        السفلي للإجراء الأساسي وحده.
      */}
      <PanelHeader
        actions={<IconButton icon="close" label={t('form.cancel')} language={language} onClick={onCancel} />}
        language={language}
        onBack={
          step === 1
            ? undefined
            : () => {
                setStep((step - 1) as Step)
              }
        }
        t={t}
        title={t('wizard.title')}
      />

      {/* مؤشر الخطوات المرجعي — أرقام بخط فاصل، والمكتمل والحالي بلون الفعل */}
      <div aria-label={t('wizard.progress')} className="stepper">
        <span className={step >= 1 ? 'active' : ''}>1</span>
        <i />
        <span className={step >= 2 ? 'active' : ''}>2</span>
        <i />
        <span className={step >= 3 ? 'active' : ''}>3</span>
      </div>

      <ScreenBody>
        {step === 1 && (
          <>
            <div className="screen-heading">
              <h2>{t('wizard.step1.title')}</h2>
              <p>{t('wizard.step1.body')}</p>
            </div>

            <Field
              error={nameError ? t('form.name.error') : undefined}
              label={t('form.name.label')}
              onChange={(value) => {
                setName(value)
                if (value.trim() !== '') setNameError(false)
              }}
              placeholder={t('form.name.placeholder')}
              required
              value={name}
            />

            {/* اختيار القالب بالبطاقات المرجعية الثلاث */}
            <div className="field">
              <span className="field-label">{t('wizard.template')}</span>
              <div className="template-grid">
                {WORKSPACE_TEMPLATES.map((candidate) => (
                  <button
                    aria-pressed={candidate === template}
                    className={candidate === template ? 'selected' : ''}
                    key={candidate}
                    onClick={() => {
                      setTemplate(candidate)
                    }}
                    type="button"
                  >
                    <Icon name={TEMPLATE_ICONS[candidate]} size={20} />
                    <strong>{t(`template.${candidate}`)}</strong>
                    <small>{t(`template.${candidate}.hint`)}</small>
                  </button>
                ))}
              </div>
            </div>

            <Field
              counter={`${goal.length} / ${GOAL_LIMIT}`}
              label={t('form.goal.label')}
              onChange={(value) => {
                setGoal(value.slice(0, GOAL_LIMIT))
              }}
              optional={t('form.goal.optional')}
              placeholder={t('form.goal.placeholder')}
              textarea
              value={goal}
            />
          </>
        )}

        {step === 2 && (
          <>
            <div className="screen-heading">
              <h2>{t('wizard.step2.title')}</h2>
              <p>{t('wizard.step2.body')}</p>
            </div>

            {tabsState.name === 'loading' && (
              <p className="screen-heading" role="status">
                <span>{t('tabs.loading')}</span>
              </p>
            )}

            {tabsState.name === 'permission-needed' && (
              <EmptyState
                action={t('permission.grant')}
                detail={t('permission.body')}
                icon="permission"
                onAction={() => {
                  void requestTabsPermission().then((result) => {
                    if (result.granted) refreshTabs()
                  })
                }}
                title={t('permission.title')}
              />
            )}

            {tabsState.name === 'error' && (
              <>
                <SystemMessage detail={t('tabs.error.body')} kind="error" title={t('tabs.error.title')} />
                <div>
                  <Button onClick={refreshTabs} size="sm" variant="secondary">
                    {t('tabs.retry')}
                  </Button>
                </div>
              </>
            )}

            {tabsState.name === 'ready' && usable.length === 0 && (
              <EmptyState detail={t('tabs.empty.body')} icon="page" title={t('tabs.empty.title')} />
            )}

            {tabsState.name === 'ready' && usable.length > 0 && (
              <>
                <div className="selection-bar">
                  <Checkbox
                    checked={selectedTabs.length === usable.length}
                    label={t('tabs.selectAll')}
                    onChange={(checked) => {
                      setSelected(checked ? new Set(usable.map((tab) => tab.index)) : new Set())
                      setDuplicateCount(undefined)
                      setAllowDuplicates(false)
                    }}
                  />
                  <span>
                    {selectedTabs.length} / {usable.length}
                  </span>
                </div>

                <div className="tab-picker">
                  {usable.map((tab) => {
                    const isSelected = selected.has(tab.index)
                    let domain = tab.url
                    try {
                      domain = new URL(tab.url).hostname
                    } catch {
                      // رابط بلا مضيف — يبقى كما هو
                    }
                    return (
                      <div className={isSelected ? 'selected' : ''} key={tab.index}>
                        <button
                          aria-label={`${t('tabs.listLabel')}: ${tab.title}`}
                          aria-pressed={isSelected}
                          className="tab-check"
                          onClick={() => {
                            toggleTab(tab.index)
                          }}
                          type="button"
                        >
                          <span>{isSelected && <Icon name="check" size={12} />}</span>
                        </button>
                        <SiteFavicon domain={domain} />
                        <div>
                          <strong>
                            <bdi>{tab.title}</bdi>
                          </strong>
                          <small>{domain}</small>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {tabsState.preview.unavailable.length > 0 && (
                  <SystemMessage
                    detail={t('tabs.unavailable.body', {
                      count: tabsState.preview.unavailable.length,
                    })}
                    kind="alert"
                    title={t('tabs.unavailable.title')}
                  />
                )}
              </>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <div className="screen-heading">
              <h2>{t('wizard.step3.title')}</h2>
              <p>{t('wizard.step3.body')}</p>
            </div>

            <div className="save-preview">
              <JusoorMark size={36} />
              <div>
                <strong>
                  <bdi>{name.trim()}</bdi>
                </strong>
                <span>
                  {t(`template.${template}`)} · {t('directory.pages', { count: selectedTabs.length })}
                </span>
              </div>
            </div>

            <div className="preview-list">
              <span>
                <Icon name="workspace" size={16} />
                {t('wizard.review.identity')}
                <Icon name="check" size={16} />
              </span>
              <span>
                <Icon name="page" size={16} />
                {t('wizard.review.pages', { count: selectedTabs.length })}
                <Icon name="check" size={16} />
              </span>
              <span>
                <Icon name="lock" size={16} />
                {t('wizard.review.local')}
                <Icon name="check" size={16} />
              </span>
            </div>

            {duplicateCount !== undefined && (
              <>
                <SystemMessage
                  detail={t('duplicates.body', { count: duplicateCount })}
                  kind="banner"
                  title={t('duplicates.title')}
                />
                <Checkbox
                  checked={allowDuplicates}
                  label={t('duplicates.saveAll')}
                  onChange={setAllowDuplicates}
                />
              </>
            )}

            {failed && (
              <SystemMessage detail={t('create.error.body')} kind="error" title={t('create.error.title')} />
            )}

            <SystemMessage kind="alert" title={t('wizard.alert')} />
          </>
        )}
      </ScreenBody>

      <BottomAction>
        {step < 3 ? (
          <Button onClick={goNext} size="lg" trailingIcon="arrow" mirrorIcon={language === 'ar'}>
            {t('wizard.continue')}
          </Button>
        ) : (
          <Button
            disabled={saving || (duplicateCount !== undefined && !allowDuplicates)}
            loading={saving}
            onClick={create}
            size="lg"
          >
            {t('wizard.createAction')}
          </Button>
        )}
      </BottomAction>
    </>
  )
}

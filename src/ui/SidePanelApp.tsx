import { useCallback, useEffect, useState } from 'react'

import { BottomAction, Button, PanelHeader, ScreenBody, SystemMessage } from './components/identity'
import { HomeScreen } from './HomeScreen'
import { CreateWizard } from './CreateWizard'
import { OnboardingScreen } from './OnboardingScreen'
import { SettingsScreen } from './SettingsScreen'
import { AboutScreen } from './AboutScreen'
import { ImportScreen } from './ImportScreen'
import { WorkspaceScreen } from './workspace/WorkspaceScreen'
import { useSettings } from './useSettings'
import {
  loadWorkspaceDirectory,
  rememberLastWorkspace,
  type WorkspaceDirectory as Directory,
} from '../app/workspace-session'
import { getExtensionVersion } from '../app/about'
import type { UseCaseResult } from '../app/errors'
import type { WorkspaceId } from '../core/ids'

import './theme/theme.css'
import './panel.css'

/**
 * اللوحة الجانبية — هيكل `PanelShell` المرجعي: عمود واحد بارتفاع الشاشة،
 * رأس ثابت، محتوى قابل للتمرير، ومنطقة إجراء سفلية ثابتة.
 *
 * التنقل حالة داخلية محدودة بلا Router: أول تشغيل (مرة واحدة) ← المساحات ←
 * (معالج الإنشاء | داخل المساحة | الإعدادات ← حول/استيراد/إعادة التعريف).
 */
type View =
  | { name: 'loading' }
  | { name: 'home'; directory: Directory }
  | { name: 'home-error' }
  | { name: 'create' }
  | { name: 'workspace'; workspaceId: WorkspaceId }
  | { name: 'settings' }
  | { name: 'about' }
  | { name: 'import' }
  /** إعادة عرض التعريف من الإعدادات — مساعدة لا بوابة. */
  | { name: 'onboarding-replay' }

function viewFromDirectory(result: UseCaseResult<Directory>): View {
  return result.ok ? { name: 'home', directory: result.value } : { name: 'home-error' }
}

export function SidePanelApp() {
  const { ready, view: settings, t, changeLanguage, changeTheme, completeFirstRun } =
    useSettings()
  const [view, setView] = useState<View>({ name: 'loading' })

  useEffect(() => {
    let active = true

    void loadWorkspaceDirectory().then((result) => {
      if (active) setView(viewFromDirectory(result))
    })

    return () => {
      active = false
    }
  }, [])

  const openHome = useCallback(() => {
    setView({ name: 'loading' })
    void loadWorkspaceDirectory().then((result) => {
      setView(viewFromDirectory(result))
    })
  }, [])

  /** فتح مساحة يسجّلها آخر مساحة مستخدمة — §9.1، ولا يتوقف عليه الفتح. */
  const openWorkspaceScreen = useCallback((workspaceId: WorkspaceId) => {
    setView({ name: 'workspace', workspaceId })
    void rememberLastWorkspace(workspaceId)
  }, [])

  if (!ready || settings === undefined) return null

  const language = settings.language

  /*
   * أول تشغيل يسبق كل شيء ويُعرض مرة واحدة: قول ما يُحفظ وأين قبل أن يبني
   * المستخدم عمله عليه (§11.1). إنهاؤه أو تخطيه يسجَّل محليًا فلا يعود تلقائيًا.
   */
  if (!settings.settings.firstRunSeen) {
    return (
      <div className="side-panel onboarding">
        <OnboardingScreen
          language={language}
          onDone={() => {
            completeFirstRun()
          }}
          t={t}
        />
      </div>
    )
  }

  return (
    <div className={`side-panel ${view.name === 'onboarding-replay' ? 'onboarding' : ''}`.trim()}>
      {view.name === 'loading' && (
        <>
          <PanelHeader language={language} t={t} title={t('app.name')} />
          <ScreenBody>
            <p className="screen-heading" role="status">
              <span>{t('panel.loading')}</span>
            </p>
          </ScreenBody>
        </>
      )}

      {view.name === 'home-error' && (
        <>
          <PanelHeader language={language} t={t} title={t('app.name')} />
          <ScreenBody>
            <SystemMessage detail={t('directory.error.body')} kind="error" title={t('directory.error.title')} />
          </ScreenBody>
          <BottomAction>
            <Button onClick={openHome} size="lg">
              {t('directory.retry')}
            </Button>
          </BottomAction>
        </>
      )}

      {view.name === 'home' && (
        <HomeScreen
          directory={view.directory}
          language={language}
          onCreate={() => {
            setView({ name: 'create' })
          }}
          onOpen={openWorkspaceScreen}
          onOpenSettings={() => {
            setView({ name: 'settings' })
          }}
          t={t}
        />
      )}

      {view.name === 'create' && (
        <CreateWizard
          language={language}
          onCancel={openHome}
          onCreated={(workspace) => {
            openWorkspaceScreen(workspace.id)
          }}
          t={t}
        />
      )}

      {view.name === 'workspace' && (
        <WorkspaceScreen
          key={view.workspaceId}
          language={language}
          onBack={openHome}
          t={t}
          workspaceId={view.workspaceId}
        />
      )}

      {view.name === 'settings' && (
        <SettingsScreen
          language={settings.settings.language}
          onBack={openHome}
          onLanguageChange={changeLanguage}
          onOpenAbout={() => {
            setView({ name: 'about' })
          }}
          onOpenImport={() => {
            setView({ name: 'import' })
          }}
          onReplayOnboarding={() => {
            setView({ name: 'onboarding-replay' })
          }}
          onThemeChange={changeTheme}
          t={t}
          theme={settings.settings.theme}
          uiLanguage={language}
          version={getExtensionVersion()}
        />
      )}

      {view.name === 'about' && (
        <AboutScreen
          language={language}
          onBack={() => {
            setView({ name: 'settings' })
          }}
          t={t}
          version={getExtensionVersion()}
        />
      )}

      {view.name === 'import' && (
        <ImportScreen
          language={language}
          onBack={() => {
            setView({ name: 'settings' })
          }}
          onDone={openHome}
          t={t}
        />
      )}

      {view.name === 'onboarding-replay' && (
        <OnboardingScreen
          language={language}
          onDone={() => {
            setView({ name: 'settings' })
          }}
          t={t}
        />
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'

import { Icon } from './icons'
import {
  JusoorMark,
  PanelHeader,
  ScreenBody,
  Segmented,
  SelectField,
  SystemMessage,
} from './components/identity'
import type { Translate } from '../i18n/messages'
import type { Language, LanguagePreference, ThemePreference } from '../core/settings'
import { hasTabsPermission, requestTabsPermission } from '../app/permissions'
import { exportAllWorkspaces } from '../app/transfer'
import { downloadTextFile, isoDateOf, suggestFileName } from './file-transfer'

/**
 * الإعدادات — السابعة من الشاشات المرجعية، على بنية `SettingsScreen` في
 * `screens.tsx`: أقسام بعناوين علوية هادئة وصفوف إعدادات مرجعية
 * (أيقونة، عنوان، وصف، سهم دخول) — لا أزرار عامة متباعدة.
 *
 * الأقسام الفعلية بقدرات V1 الحقيقية: المظهر واللغة، الصلاحيات (حالة `tabs`
 * الاختيارية الصادقة)، البيانات (تصدير واستيراد — لا «حذف الكل»: الحذف خارج
 * V1 بقرار موثق), المساعدة (إعادة عرض التعريف)، وعن جُسور.
 */
export interface SettingsScreenProps {
  t: Translate
  language: LanguagePreference
  uiLanguage: Language
  theme: ThemePreference
  version: string | undefined
  onLanguageChange: (language: LanguagePreference) => void
  onThemeChange: (theme: ThemePreference) => void
  onOpenImport: () => void
  onOpenAbout: () => void
  onReplayOnboarding: () => void
  onBack: () => void
}

type ExportState = 'idle' | 'done' | 'failed'

export function SettingsScreen({
  t,
  language,
  uiLanguage,
  theme,
  version,
  onLanguageChange,
  onThemeChange,
  onOpenImport,
  onOpenAbout,
  onReplayOnboarding,
  onBack,
}: SettingsScreenProps) {
  const [tabsGranted, setTabsGranted] = useState<boolean | undefined>(undefined)
  const [exportState, setExportState] = useState<ExportState>('idle')

  useEffect(() => {
    let active = true
    void hasTabsPermission().then((granted) => {
      if (active) setTabsGranted(granted)
    })
    return () => {
      active = false
    }
  }, [])

  const exportAll = () => {
    setExportState('idle')
    void exportAllWorkspaces().then((result) => {
      if (!result.ok) {
        setExportState('failed')
        return
      }
      const done = downloadTextFile(
        result.value.json,
        suggestFileName(t('app.name'), isoDateOf(Date.now())),
        'application/json',
      )
      setExportState(done ? 'done' : 'failed')
    })
  }

  return (
    <>
      <PanelHeader language={uiLanguage} onBack={onBack} t={t} title={t('settings.title')} />

      <ScreenBody className="settings-body">
        <section>
          <h3>{t('settings.section.appearance')}</h3>

          <SelectField
            label={t('settings.language')}
            onChange={onLanguageChange}
            options={[
              { value: 'auto', label: t('settings.language.auto') },
              { value: 'ar', label: t('settings.language.ar') },
              { value: 'en', label: t('settings.language.en') },
            ]}
            value={language}
          />
          <p className="reason-line">
            <span>
              <small>{t('settings.language.note')}</small>
            </span>
          </p>

          <div className="field">
            <span className="field-label">{t('settings.theme')}</span>
            <Segmented
              items={[
                { value: 'system', label: t('settings.theme.system') },
                { value: 'light', label: t('settings.theme.light') },
                { value: 'dark', label: t('settings.theme.dark') },
              ]}
              label={t('settings.theme')}
              onChange={onThemeChange}
              value={theme}
            />
          </div>
        </section>

        <section>
          <h3>{t('settings.section.permissions')}</h3>

          <button
            className="settings-link"
            disabled={tabsGranted === true}
            onClick={() => {
              void requestTabsPermission().then((result) => {
                setTabsGranted(result.granted)
              })
            }}
            type="button"
          >
            <span>
              <Icon name="permission" size={18} />
              <b>{t('settings.permissions.tabs')}</b>
              <small>
                {tabsGranted === undefined
                  ? t('panel.loading')
                  : tabsGranted
                    ? t('settings.permissions.tabs.granted')
                    : t('settings.permissions.tabs.request')}
              </small>
            </span>
            {tabsGranted === false && <Icon mirrored={uiLanguage === 'ar'} name="chevron" size={16} />}
          </button>
          <p className="reason-line">
            <span>
              <small>{t('settings.permissions.tabs.note')}</small>
            </span>
          </p>
        </section>

        <section>
          <h3>{t('settings.section.data')}</h3>

          <button className="settings-link" onClick={exportAll} type="button">
            <span>
              <Icon name="export" size={18} />
              <b>{t('transfer.backup.exportAll')}</b>
              <small>{t('settings.export.hint')}</small>
            </span>
            <Icon mirrored={uiLanguage === 'ar'} name="chevron" size={16} />
          </button>

          {exportState === 'done' && <SystemMessage kind="toast" title={t('settings.export.done')} />}
          {exportState === 'failed' && (
            <SystemMessage
              detail={t('transfer.export.error.body')}
              kind="error"
              title={t('transfer.export.error.title')}
            />
          )}

          <button className="settings-link" onClick={onOpenImport} type="button">
            <span>
              <Icon name="import" size={18} />
              <b>{t('transfer.import.action')}</b>
              <small>{t('settings.import.hint')}</small>
            </span>
            <Icon mirrored={uiLanguage === 'ar'} name="chevron" size={16} />
          </button>

          <p className="reason-line">
            <span>
              <small>{t('settings.storage.body')}</small>
            </span>
          </p>
        </section>

        <section>
          <h3>{t('settings.section.help')}</h3>

          <button className="settings-link" onClick={onReplayOnboarding} type="button">
            <span>
              <Icon name="info" size={18} />
              <b>{t('settings.help.onboarding')}</b>
              <small>{t('settings.help.onboarding.hint')}</small>
            </span>
            <Icon mirrored={uiLanguage === 'ar'} name="chevron" size={16} />
          </button>
        </section>

        <section>
          <h3>{t('settings.section.about')}</h3>

          <div className="about-row">
            <JusoorMark size={36} />
            <div>
              <strong>{t('app.name')}</strong>
              {version !== undefined && <span>{t('about.version', { version })}</span>}
              <small>{t('app.tagline')}</small>
            </div>
          </div>

          <button className="settings-link" onClick={onOpenAbout} type="button">
            <span>
              <Icon name="info" size={18} />
              <b>{t('about.entry.title')}</b>
              <small>{t('about.entry.action')}</small>
            </span>
            <Icon mirrored={uiLanguage === 'ar'} name="chevron" size={16} />
          </button>
        </section>
      </ScreenBody>
    </>
  )
}

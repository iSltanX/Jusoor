import { useState } from 'react'

import { Icon } from './icons'
import { Button, JusoorMark, PanelHeader, ScreenBody, SystemMessage } from './components/identity'
import type { Translate } from '../i18n/messages'
import type { Language } from '../core/settings'
import { checkForUpdates, type UpdateCheckResult } from '../app/about'
import {
  CHANGELOG_URL,
  DEVELOPER_GITHUB_URL,
  NEW_ISSUE_URL,
  RELEASES_URL,
  REPOSITORY_URL,
} from '../core/project-links'

/**
 * شاشة «حول» — تُفتح من الإعدادات، معاد تنسيقها على نظام الهوية: العودة في
 * الرأس، هوية جُسور أولًا وأعلى حضورًا (الرمز فالاسم فالوصف فالإصدار)، ثم
 * التحديثات، ثم روابط المشروع صفوفَ إعدادات مرجعية، وحقوق المطور أسفل
 * المعلومات كتوقيع هادئ — أصغر بدرجتين من اسم المنتج وأقل تباينًا بدرجة،
 * بلا زر ولا مساحة لونية.
 *
 * قسم التحديثات صادق مع منصة الإضافات: المتجر والمتصفح يديران التثبيت
 * تلقائيًا دومًا، وجُسور لا يتصل بالشبكة مباشرة (`connect-src 'none'`). زر
 * «التحقق من وجود تحديثات» يستدعي الآلية الحقيقية الوحيدة المتاحة —
 * `chrome.runtime.requestUpdateCheck()` عبر `browser/runtime-info.ts` ثم
 * `app/about.ts` — بلا منطق فحص أو مقارنة إصدار موازٍ. الحالات الثلاث تُعرض
 * بصدق دون دمج: تحديث متاح (يثبّته المتصفح تلقائيًا)، لا تحديث، أو تعذّر
 * التحقق الآن (`throttled`/`unavailable` لا تُقرأ خطأً بوصفها «لا تحديث») —
 * يعدّل قرار 0017 (٢١ يوليو ٢٠٢٦) الذي رفض الزر مبدئيًا لهذا التمييز تحديدًا.
 *
 * الروابط تنقّل يفتحه المستخدم بنقرة صريحة في تبويب جديد، من المصدر المركزي
 * `core/project-links.ts` وحده — لا رابط مكتوب هنا حرفيًا.
 */
export interface AboutScreenProps {
  t: Translate
  language: Language
  /** من manifest التشغيل الفعلي عبر app/about — undefined خارج سياق الإضافة فيُخفى السطر. */
  version: string | undefined
  onBack: () => void
}

/**
 * العلامة المصغرة للمطور — من حزمة Sultan Visual Identity.
 *
 * المصدر: `assets/monogram/sultan-monogram-brand.svg` (وهي البنية نفسها داخل
 * أصلَي الحقوق `rights-compact.svg` و`rights-bilingual.svg`).
 * بيانات المسار الخمسة منقولة حرفيًا دون أي تعديل، وقاعدة سلامة الحزمة
 * (`integrity.json`) تنص: «Preserve path data and proportions. Recolor,
 * scale, and position only» — والمطبق هنا إعادة تلوين عبر `currentColor`
 * إلى Token جُسور النصي الثانوي، وتحجيم متناسب فقط.
 *
 * لون سلطان الأصلي (`#D2916C`) لا يدخل واجهة جُسور — دستور هوية جُسور §6 لا
 * يعرف هذا اللون، ونظام عائلة منتجات سلطان نفسه يمنع تلوين المخطوطة بلون
 * المنتج؛ فتُرسم بحبر نصي محايد يعمل في السمتين.
 * يفرض حارس `tests/guards/developer-credit.test.ts` بقاء المسارات حرفيةً
 * وبقاء ألوان سلطان خارج المصدر.
 */
function DeveloperMark() {
  return (
    <svg aria-hidden="true" className="j-credit-mark" focusable="false" viewBox="0 0 100 100">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="8.5">
        <path d="M24 63H74" />
        <path d="M35 63V45" />
        <path d="M48 63V42" />
        <path d="M61 63V45" />
        <path d="M74 63q7 11-3 17" />
      </g>
    </svg>
  )
}

/** صف رابط خارجي على بنية صف الإعدادات المرجعي — يُفتح في تبويب جديد. */
function LinkRow({
  href,
  label,
  language,
}: {
  href: string
  label: string
  language: Language
}) {
  return (
    <a className="settings-link" href={href} rel="noreferrer" target="_blank">
      <span>
        <Icon name="external" size={18} />
        <b>{label}</b>
        {/* عرض النطاق بلا مخطط — بنمط لا يترك نص رابط خام في الحزمة المبنية */}
        <small dir="ltr">{href.replace(/^https?:\/\//, '')}</small>
      </span>
      <Icon mirrored={language === 'ar'} name="chevron" size={16} />
    </a>
  )
}

type CheckState = 'idle' | 'checking' | UpdateCheckResult

export function AboutScreen({ t, language, version, onBack }: AboutScreenProps) {
  const [checkState, setCheckState] = useState<CheckState>('idle')

  const runCheck = () => {
    setCheckState('checking')
    void checkForUpdates().then(setCheckState)
  }

  return (
    <>
      <PanelHeader language={language} onBack={onBack} t={t} title={t('about.entry.title')} />

      <ScreenBody className="settings-body">
        {/* هوية جُسور — العنصر الأعلى حضورًا في الصفحة */}
        <div className="empty-state">
          <JusoorMark size={64} />
          <h4>{t('app.name')}</h4>
          <p>{t('about.description')}</p>
          {version !== undefined && (
            <p className="about-version">{t('about.version', { version })}</p>
          )}
        </div>

        <section>
          <h3>{t('about.updates.title')}</h3>
          <p className="reason-line">
            <span>
              <small>{t('about.updates.body')}</small>
            </span>
          </p>

          {/* فحص فوري عبر آلية المتصفح الحقيقية وحدها — لا يظهر خارج سياق
              الإضافة، حيث لا توجد قناة فحص أصلًا (يطابق إخفاء سطر الإصدار). */}
          {version !== undefined && (
            <>
              <div>
                <Button
                  loading={checkState === 'checking'}
                  onClick={runCheck}
                  size="sm"
                  variant="secondary"
                >
                  {checkState === 'checking' ? t('about.updates.checking') : t('about.updates.check')}
                </Button>
              </div>

              {checkState !== 'idle' && checkState !== 'checking' && (
                <SystemMessage
                  kind={checkState.status === 'update_available' ? 'toast' : 'alert'}
                  title={
                    checkState.status === 'no_update'
                      ? t('about.updates.upToDate')
                      : checkState.status === 'update_available'
                        ? t('about.updates.available', { version: checkState.version ?? '' })
                        : t('about.updates.throttled')
                  }
                />
              )}
            </>
          )}

          <LinkRow href={RELEASES_URL} label={t('about.updates.releases')} language={language} />
          <LinkRow href={CHANGELOG_URL} label={t('about.updates.changelog')} language={language} />
        </section>

        <section>
          <h3>{t('about.project.title')}</h3>
          <LinkRow href={REPOSITORY_URL} label={t('about.project.repository')} language={language} />
          <LinkRow href={NEW_ISSUE_URL} label={t('about.project.issue')} language={language} />
        </section>

        {/* حقوق المطور — توقيع هادئ أسفل المعلومات، لا هوية ثانية */}
        <footer className="j-credit">
          <DeveloperMark />
          <p className="j-credit-line">{t('about.credit.full')}</p>
          <p className="j-credit-line">{t('about.credit.rights')}</p>
          <a className="j-credit-link" href={DEVELOPER_GITHUB_URL} rel="noreferrer" target="_blank">
            {t('about.credit.github')}
          </a>
        </footer>
      </ScreenBody>
    </>
  )
}

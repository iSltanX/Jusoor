import { useState } from 'react'

import { Icon, type IconName } from './icons'
import { BottomAction, Button, JusoorMark, PanelHeader, ScreenBody } from './components/identity'
import type { Translate } from '../i18n/messages'
import type { Language } from '../core/settings'

/**
 * أول تشغيل — الثامنة من الشاشات المرجعية، على بنية `OnboardingScreen` في
 * `screens.tsx`: الرمز فوق مسار محفوظ، ثلاث شرائح بأيقونة وعنوان ونص،
 * مؤشر نقاط، وزر «تخطي» في الرأس، والإجراء الأساسي «متابعة» ثم
 * «أنشئ أول مساحة» في المنطقة السفلية.
 *
 * الشريحة الثالثة كُيّفت لصدق قدرات V1: لا صلاحيات مواقع في المنتج أصلًا،
 * فالشرح عن صلاحية `tabs` الاختيارية وحدها (قرار 0004) بدل «إذن الموقع
 * للاستعادة» في النموذج — لا ادعاء لقدرة غير موجودة (§15 هوية).
 *
 * تُعرض مرة واحدة عند أول استخدام (`firstRunSeen`)، ويمكن إعادة فتحها من
 * الإعدادات بوصفها مساعدة — لا تظهر تلقائيًا مجددًا.
 */
export interface OnboardingScreenProps {
  t: Translate
  language: Language
  onDone: () => void
}

const SLIDES: readonly { icon: IconName; key: 'context' | 'local' | 'permission' }[] = [
  { icon: 'checkpoint', key: 'context' },
  { icon: 'lock', key: 'local' },
  { icon: 'permission', key: 'permission' },
]

export function OnboardingScreen({ t, language, onDone }: OnboardingScreenProps) {
  const [step, setStep] = useState(0)
  const slide = SLIDES[step] ?? SLIDES[0]
  const last = step === SLIDES.length - 1

  if (slide === undefined) return null

  return (
    <>
      <PanelHeader
        actions={
          <Button onClick={onDone} size="sm" variant="text">
            {t('onboarding.skip')}
          </Button>
        }
        language={language}
        t={t}
        title={t('app.name')}
      />

      <ScreenBody>
        {/* الرمز فوق «المسار المحفوظ» — بوابة الحفظ في المنتصف */}
        <div className="onboarding-mark">
          <JusoorMark size={72} />
          <span aria-hidden="true" className="context-path">
            <i />
            <b />
            <i />
          </span>
        </div>

        <div className="onboarding-copy">
          <span className="onboarding-icon">
            <Icon name={slide.icon} size={26} />
          </span>
          <h1>{t(`onboarding.${slide.key}.title`)}</h1>
          <p>{t(`onboarding.${slide.key}.body`)}</p>
        </div>

        <div aria-hidden="true" className="onboarding-dots">
          {SLIDES.map((candidate, index) => (
            <span className={index === step ? 'active' : ''} key={candidate.key} />
          ))}
        </div>
      </ScreenBody>

      <BottomAction>
        <Button
          mirrorIcon={language === 'ar'}
          onClick={() => {
            if (last) onDone()
            else setStep(step + 1)
          }}
          size="lg"
          trailingIcon={last ? undefined : 'arrow'}
        >
          {last ? t('onboarding.start') : t('onboarding.continue')}
        </Button>
      </BottomAction>
    </>
  )
}

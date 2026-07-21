import { useState } from 'react'

import {
  BottomAction,
  Button,
  ConfirmDialog,
  Field,
  PanelHeader,
  ScreenBody,
  SystemMessage,
} from '../components/identity'
import type { Translate } from '../../i18n/messages'
import type { Language } from '../../core/settings'
import type { Workspace } from '../../core/workspace'

/**
 * التجميد — دورة §9.2: طلب خفيف لتسجيل نقطة التوقف والخطوة التالية دون
 * إلزام، ثم اختيار صريح بين التجميد وحده والتجميد مع إغلاق تبويبات المساحة.
 *
 * الإغلاق فعل مدمر: يمر بحوار التأكيد المرجعي (نمط dialog في القسم 07)
 * ولا يقع بمجرد التجميد — §10.6 هوية.
 */
export interface FreezePanelProps {
  workspace: Workspace
  t: Translate
  language: Language
  saving: boolean
  onFreeze: (input: { lastReached: string; nextStep: string; closeOpenTabs: boolean }) => void
  onCancel: () => void
}

export function FreezePanel({ workspace, t, language, saving, onFreeze, onCancel }: FreezePanelProps) {
  const [lastReached, setLastReached] = useState(workspace.lastReached ?? '')
  const [nextStep, setNextStep] = useState(workspace.nextStep ?? '')
  const [confirmingClose, setConfirmingClose] = useState(false)

  return (
    <>
      <PanelHeader language={language} onBack={onCancel} t={t} title={t('freeze.title')} />

      <ScreenBody>
        <div className="screen-heading">
          <h2>{t('freeze.title')}</h2>
          <p>{t('freeze.body')}</p>
        </div>

        <Field
          label={t('workspace.lastReached')}
          onChange={setLastReached}
          optional={t('form.goal.optional')}
          placeholder={t('workspace.lastReached.placeholder')}
          textarea
          value={lastReached}
        />

        <Field
          label={t('workspace.nextStep')}
          onChange={setNextStep}
          optional={t('form.goal.optional')}
          placeholder={t('workspace.nextStep.placeholder')}
          textarea
          value={nextStep}
        />

        <SystemMessage
          detail={t('freeze.closeTabs.helper')}
          kind="alert"
          title={t('freeze.closeTabs')}
        />
      </ScreenBody>

      <BottomAction>
        <Button
          disabled={saving}
          onClick={() => {
            setConfirmingClose(true)
          }}
          size="lg"
          variant="secondary"
        >
          {t('freeze.submitAndClose')}
        </Button>
        <Button
          disabled={saving}
          icon="freeze"
          loading={saving}
          onClick={() => {
            onFreeze({ lastReached, nextStep, closeOpenTabs: false })
          }}
          size="lg"
        >
          {t('freeze.submit')}
        </Button>
      </BottomAction>

      {/* حوار التأكيد المرجعي — إغلاق التبويبات فعل مدمر لا يقع ضمنًا */}
      {confirmingClose && (
        <ConfirmDialog
          body={t('freeze.closeTabs.confirm.body')}
          cancelLabel={t('form.cancel')}
          confirmLabel={t('freeze.submitAndClose')}
          icon="freeze"
          onCancel={() => {
            setConfirmingClose(false)
          }}
          onConfirm={() => {
            setConfirmingClose(false)
            onFreeze({ lastReached, nextStep, closeOpenTabs: true })
          }}
          title={t('freeze.closeTabs.confirm.title')}
        />
      )}
    </>
  )
}

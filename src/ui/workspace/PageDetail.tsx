import { useState } from 'react'

import { Icon } from '../icons'
import {
  BottomAction,
  Button,
  ConfirmDialog,
  Field,
  PanelHeader,
  ScreenBody,
  SectionHead,
  SelectField,
  SiteFavicon,
} from '../components/identity'
import { domainOf, faviconTone, isPdfUrl } from './PageCard'
import type { Translate } from '../../i18n/messages'
import type { Language } from '../../core/settings'
import type { PageNote, SavedPage } from '../../core/page'
import {
  PAGE_PROGRESS_STATUSES,
  PAGE_ROLES,
  type PageProgressStatus,
  type PageRole,
} from '../../core/enums'
import { normalizeLabels } from '../../core/validation'

/**
 * تفاصيل الصفحة — الرابعة من الشاشات المرجعية، على بنية `PageDetailsScreen`
 * في `screens.tsx`: العودة في الرأس (لا شريط رجوع سفلي)، ترويسة الصفحة
 * (رمز الموقع والعنوان والرابط الخارجي)، حقلا التصنيف المستقلان (التقدم
 * والدور — لا يُدمجان)، سبب الفتح، الوسوم، ثم قسم الملاحظات ببطاقاتها
 * وتواريخها، والإجراء الأساسي السفلي «افتح الصفحة».
 *
 * منطقة الخطر المرجعية منفَّذة: إزالة الصفحة نهائيًا بتأكيد تدميري بأعداد
 * حقيقية (قرار 0018 — لا سلة محذوفات ولا تراجع في V1). قسم التظليلات وحده
 * غير معروض: التظليل مؤجل بنص دستور المنتج §14 — لا واجهة لقدرة غير موجودة.
 */
export interface PageDetailProps {
  page: SavedPage
  t: Translate
  language: Language
  saving: boolean
  onSaveFields: (patch: {
    title: string
    reason: string
    progressStatus: PageProgressStatus
    role?: PageRole
    labels: string[]
  }) => void
  onAddNote: (body: string) => void
  onEditNote: (noteId: PageNote['id'], body: string) => void
  onDeleteNote: (noteId: PageNote['id']) => void
  /** حذف الصفحة نهائيًا من المساحة — بعد التأكيد التدميري هنا (قرار 0018). */
  onRemovePage: () => void
  onBack: () => void
}

/** قيمة «لم يُصنَّف بعد» في قائمة الدور — الغياب حالة صريحة لا خيار محذوف (§7.3). */
const ROLE_NONE = 'none' as const

function formatStamp(timestamp: number, language: Language): string {
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(timestamp)
}

export function PageDetail({
  page,
  t,
  language,
  saving,
  onSaveFields,
  onAddNote,
  onEditNote,
  onDeleteNote,
  onRemovePage,
  onBack,
}: PageDetailProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [title, setTitle] = useState(page.title)
  const [reason, setReason] = useState(page.reason ?? '')
  const [progress, setProgress] = useState<PageProgressStatus>(page.progressStatus)
  const [role, setRole] = useState<PageRole | typeof ROLE_NONE>(page.role ?? ROLE_NONE)
  const [labelsText, setLabelsText] = useState((page.labels ?? []).join('، '))

  const [noteDraft, setNoteDraft] = useState('')
  const [editingNote, setEditingNote] = useState<PageNote['id'] | undefined>(undefined)
  const [editDraft, setEditDraft] = useState('')

  const domain = domainOf(page.url)

  const save = () => {
    onSaveFields({
      title: title.trim() === '' ? page.title : title.trim(),
      reason: reason.trim(),
      progressStatus: progress,
      ...(role === ROLE_NONE ? {} : { role }),
      labels: normalizeLabels(labelsText.split(/[،,]/)),
    })
  }

  return (
    <>
      <PanelHeader language={language} onBack={onBack} t={t} title={t('page.details')} />

      <ScreenBody>
        {/* ترويسة الصفحة المرجعية — الرمز والعنوان والرابط */}
        <div className="page-detail-heading">
          <SiteFavicon domain={domain} tone={faviconTone(page)} />
          <div>
            <h2>
              <bdi>{page.title}</bdi>
            </h2>
            <a href={page.url} rel="noreferrer" target="_blank">
              {domain}
              {isPdfUrl(page.url) && ` · ${t('page.pdf')}`} <Icon name="external" size={12} />
            </a>
          </div>
        </div>

        {/* التصنيف — بُعدان مستقلان (§10.3 هوية) */}
        <div className="taxonomy-fields">
          <SelectField
            label={t('page.progress')}
            onChange={setProgress}
            options={PAGE_PROGRESS_STATUSES.map((status) => ({
              value: status,
              label: t(`progress.${status}`),
            }))}
            value={progress}
          />
          <SelectField
            label={t('page.role')}
            onChange={setRole}
            options={[
              { value: ROLE_NONE, label: t('page.role.none') },
              ...PAGE_ROLES.map((candidate) => ({
                value: candidate,
                label: t(`role.${candidate}`),
              })),
            ]}
            value={role}
          />
        </div>

        <Field label={t('page.title')} onChange={setTitle} value={title} />

        <Field
          label={t('page.reason')}
          onChange={setReason}
          placeholder={t('page.reason.placeholder')}
          textarea
          value={reason}
        />

        <Field
          helper={t('page.labels.helper')}
          label={t('page.labels')}
          onChange={setLabelsText}
          optional={t('page.labels.optional')}
          placeholder={t('page.labels.placeholder')}
          value={labelsText}
        />

        <div className="dialog-actions">
          <Button disabled={saving} loading={saving} onClick={save} variant="secondary">
            {saving ? t('action.saving') : t('action.save')}
          </Button>
        </div>

        {/* الملاحظات — §7.6: تُعرض من داخل المساحة دون فتح الصفحة */}
        <section className="detail-section">
          <SectionHead
            meta={page.notes.length > 0 ? page.notes.length : undefined}
            title={
              <>
                <Icon name="note" size={16} />
                {t('page.notes.title')}
              </>
            }
          />

          {page.notes.length === 0 && (
            <p className="empty-note">{t('page.notes.empty')}</p>
          )}

          {page.notes.map((note) =>
            editingNote === note.id ? (
              <div className="note-card" key={note.id}>
                <Field
                  label={t('page.notes.title')}
                  onChange={setEditDraft}
                  textarea
                  value={editDraft}
                />
                <div className="note-actions">
                  <Button
                    onClick={() => {
                      setEditingNote(undefined)
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    {t('form.cancel')}
                  </Button>
                  <Button
                    disabled={saving || editDraft.trim() === ''}
                    onClick={() => {
                      onEditNote(note.id, editDraft)
                      setEditingNote(undefined)
                    }}
                    size="sm"
                  >
                    {t('action.save')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="note-card" key={note.id}>
                <p>
                  <bdi>{note.body}</bdi>
                </p>
                <small>{formatStamp(note.updatedAt, language)}</small>
                <div className="note-actions">
                  <Button
                    onClick={() => {
                      setEditingNote(note.id)
                      setEditDraft(note.body)
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    {t('action.edit')}
                  </Button>
                  <Button
                    disabled={saving}
                    onClick={() => {
                      onDeleteNote(note.id)
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    {t('action.delete')}
                  </Button>
                </div>
              </div>
            ),
          )}

          <Field
            label={t('page.notes.add')}
            onChange={setNoteDraft}
            placeholder={t('page.notes.placeholder')}
            textarea
            value={noteDraft}
          />
          <div>
            <Button
              disabled={saving || noteDraft.trim() === ''}
              icon="plus"
              onClick={() => {
                onAddNote(noteDraft)
                setNoteDraft('')
              }}
              size="sm"
              variant="text"
            >
              {t('page.notes.saveNote')}
            </Button>
          </div>
        </section>

        <p className="reason-line">
          <Icon name="clock" size={14} />
          <span>
            <small>
              {t('page.addedAt')}: {formatStamp(page.addedAt, language)} ·{' '}
              {t('page.updatedAt')}: {formatStamp(page.updatedAt, language)}
            </small>
          </span>
        </p>

        {/* منطقة الخطر المرجعية — حذف نهائي بتأكيد تدميري (قرار 0018) */}
        <div className="danger-zone">
          <Button
            disabled={saving}
            icon="trash"
            onClick={() => {
              setConfirmingRemove(true)
            }}
            size="sm"
            variant="danger"
          >
            {t('page.remove')}
          </Button>
          <small>{t('page.remove.hint')}</small>
        </div>
      </ScreenBody>

      <BottomAction>
        <a className="button primary lg" href={page.url} rel="noreferrer" target="_blank">
          <Icon name="external" size={20} />
          <span>{t('page.open')}</span>
        </a>
      </BottomAction>

      {confirmingRemove && (
        <ConfirmDialog
          body={t('page.remove.confirm.body', {
            title: page.title,
            notes: page.notes.length,
          })}
          cancelLabel={t('form.cancel')}
          confirmLabel={t('page.remove')}
          onCancel={() => {
            setConfirmingRemove(false)
          }}
          onConfirm={() => {
            setConfirmingRemove(false)
            onRemovePage()
          }}
          title={t('page.remove.confirm.title')}
        />
      )}
    </>
  )
}

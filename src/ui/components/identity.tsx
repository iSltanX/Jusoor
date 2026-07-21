import type { ChangeEventHandler, ReactNode } from 'react'

import { Icon, type IconName } from '../icons'
import type { Language } from '../../core/settings'
import type { PageProgressStatus, PageRole, TabOpeningStatus } from '../../core/enums'
import type { Translate } from '../../i18n/messages'

/**
 * نظام مكونات جُسور — منقول من المصدر التنفيذي المعتمد `src/ui.tsx` في حزمة
 * Jusoor Identity System v2 (مصادر الحقيقة §2 بند 3 في دستور الهوية).
 *
 * بنية كل مكوّن وأصنافه وأيقوناته منقولة من المصدر نفسه. التكييفات المعمارية
 * الموثقة في تقرير التسليم:
 *   - الحقول controlled بدل defaultValue: المنتج يحفظ فعليًا لا يعرض نماذج.
 *   - النصوص من نظام i18n بدل copy() المضمّنة: القاموس واحد للمنتج كله.
 *   - JusoorMark يستهلك أصل الحزمة `favicon.svg` كما في مرحلة التأسيس؛ ولا
 *     يُرسم الرمز من جديد (دستور الهوية §5.4).
 *   - لا أنماط مضمّنة: حالات الانعكاس والألوان كلها أصناف CSS بقيم Tokens.
 */

// ===== الرمز =====

import markUrl from '../../../identity/brand/favicon.svg'

export function JusoorMark({ size = 40 }: { size?: number }) {
  return <img alt="" className="jusoor-mark" height={size} src={markUrl} width={size} />
}

// ===== الأزرار =====

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'text' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export function Button({
  children,
  icon,
  trailingIcon,
  mirrorIcon = false,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ariaLabel,
  onClick,
  type = 'button',
}: {
  children?: ReactNode
  icon?: IconName | undefined
  trailingIcon?: IconName | undefined
  /** انعكاس الأيقونة الاتجاهية في RTL — الأيقونات الاتجاهية وحدها تنعكس (§9 هوية). */
  mirrorIcon?: boolean
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  className?: string
  ariaLabel?: string | undefined
  onClick?: (() => void) | undefined
  type?: 'button' | 'submit'
}) {
  const iconOnly = children === undefined
  return (
    <button
      type={type}
      className={`button ${variant} ${size} ${iconOnly ? 'icon-only' : ''} ${mirrorIcon ? 'mirror-icon' : ''} ${className}`.trim()}
      disabled={disabled || loading}
      aria-label={ariaLabel ?? (typeof children === 'string' ? children : undefined)}
      aria-busy={loading || undefined}
      onClick={onClick}
    >
      {loading ? (
        <Icon className="spin" name="spinner" size={16} />
      ) : icon !== undefined ? (
        <Icon name={icon} size={size === 'sm' ? 16 : 20} />
      ) : null}
      {children !== undefined && <span>{children}</span>}
      {trailingIcon !== undefined && <Icon name={trailingIcon} size={16} />}
    </button>
  )
}

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  directional = false,
  language = 'ar',
  disabled = false,
  onClick,
}: {
  icon: IconName
  label: string
  variant?: ButtonVariant
  size?: ButtonSize
  directional?: boolean
  language?: Language
  disabled?: boolean
  onClick?: (() => void) | undefined
}) {
  return (
    <span className="tooltip-wrap" data-tooltip={label}>
      <Button
        ariaLabel={label}
        disabled={disabled}
        icon={icon}
        mirrorIcon={directional && language === 'ar'}
        onClick={onClick}
        size={size}
        variant={variant}
      />
    </span>
  )
}

// ===== شارات التقدم وأدوار الصفحات — بُعدان مستقلان لا يُدمجان (§10.3 هوية) =====

const PROGRESS_ICONS: Record<PageProgressStatus, IconName> = {
  'not-started': 'circle',
  'in-progress': 'clock',
  paused: 'pause',
  complete: 'check',
}

export function ProgressBadge({ state, t }: { state: PageProgressStatus; t: Translate }) {
  return (
    <span className={`progress-badge ${state}`}>
      <Icon name={PROGRESS_ICONS[state]} size={12} />
      {t(`progress.${state}`)}
    </span>
  )
}

export function RoleTag({ role, t }: { role: PageRole; t: Translate }) {
  return <span className={`role-tag ${role}`}>{t(`role.${role}`)}</span>
}

// ===== نتيجة فتح التبويب — نظام الاستعادة الصادق (§10.4 هوية) =====

/**
 * حالات V1 الفعلية هي حالات فتح التبويب الأربع (قرار 0013): لا موضع قراءة
 * محفوظًا بعد، فعرض «استعادة موضع» ادعاء — الحالات الثماني الكاملة تكتمل مع
 * قدرة الموضع المؤجلة دستوريًا (دستور المنتج §14).
 */
const TAB_STATUS_ICONS: Record<TabOpeningStatus, IconName> = {
  opened: 'success',
  unavailable: 'unavailable',
  'not-attempted': 'clock',
  opening: 'spinner',
}

export function RestoreNotice({
  state,
  t,
  compact = false,
}: {
  state: TabOpeningStatus
  t: Translate
  compact?: boolean
}) {
  return (
    <span className={`restore-notice ${state} ${compact ? 'compact' : ''}`.trim()}>
      <Icon
        className={state === 'opening' ? 'spin' : undefined}
        name={TAB_STATUS_ICONS[state]}
        size={compact ? 16 : 20}
      />
      <span className="restore-notice-body">
        <strong>{t(`tabStatus.${state}`)}</strong>
        {!compact && <span>{t(`tabStatus.${state}.detail`)}</span>}
      </span>
    </span>
  )
}

// ===== الحقول =====

export function Field({
  label,
  value,
  onChange,
  placeholder,
  helper,
  error,
  textarea = false,
  required = false,
  optional,
  counter,
  rows = 3,
  type = 'text',
  disabled = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string | undefined
  helper?: string | undefined
  /** رسالة الخطأ تُربط بالحقل عبر aria — لا لون وحده (§10.2 هوية). */
  error?: string | undefined
  textarea?: boolean
  required?: boolean
  /** نص «اختياري» — يظهر نصيًا لا لونًا (§10.2 هوية). */
  optional?: string | undefined
  counter?: string | undefined
  rows?: number
  type?: 'text' | 'search' | 'url'
  disabled?: boolean
}) {
  const handle: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = (event) => {
    onChange(event.target.value)
  }

  return (
    <label className={`field ${error !== undefined ? 'error' : ''}`.trim()}>
      <span className="field-label">
        {label}
        {required && <b aria-hidden="true"> *</b>}
        {optional !== undefined && <small>{optional}</small>}
      </span>
      <span className="field-control">
        {textarea ? (
          <textarea
            aria-invalid={error !== undefined || undefined}
            disabled={disabled}
            onChange={handle}
            placeholder={placeholder}
            rows={rows}
            value={value}
          />
        ) : (
          <input
            aria-invalid={error !== undefined || undefined}
            disabled={disabled}
            onChange={handle}
            placeholder={placeholder}
            type={type}
            value={value}
          />
        )}
      </span>
      {(error !== undefined || helper !== undefined || counter !== undefined) && (
        <span className="field-meta">
          <small role={error !== undefined ? 'alert' : undefined}>{error ?? helper}</small>
          {counter !== undefined && <small>{counter}</small>}
        </span>
      )}
    </label>
  )
}

export function SelectField<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: Value
  options: readonly { value: Value; label: string }[]
  onChange: (value: Value) => void
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-control">
        <select
          onChange={(event) => {
            onChange(event.target.value as Value)
          }}
          value={value}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon className="select-chevron" name="chevron" size={16} />
      </span>
    </label>
  )
}

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="check-row">
      <input
        checked={checked}
        onChange={(event) => {
          onChange(event.target.checked)
        }}
        type="checkbox"
      />
      <span>
        <Icon name="check" size={12} />
      </span>
      {label}
    </label>
  )
}

export function Segmented<Value extends string>({
  label,
  items,
  value,
  onChange,
}: {
  label: string
  items: readonly { value: Value; label: string; count?: number }[]
  value: Value
  onChange: (value: Value) => void
}) {
  return (
    <div aria-label={label} className="segmented" role="group">
      {items.map((item) => (
        <button
          aria-pressed={item.value === value}
          className={item.value === value ? 'selected' : ''}
          key={item.value}
          onClick={() => {
            onChange(item.value)
          }}
          type="button"
        >
          {item.label}
          {item.count !== undefined && <span className="segment-count">{item.count}</span>}
        </button>
      ))}
    </div>
  )
}

// ===== هيكل اللوحة =====

/**
 * رأس اللوحة المرجعي: العودة في الرأس حين تعرضها الشاشة، والرمز في الشاشات
 * الجذرية — `PanelHeader` من ui.tsx حرفيًا.
 */
export function PanelHeader({
  title,
  language,
  t,
  onBack,
  actions,
}: {
  title: string
  language: Language
  t: Translate
  onBack?: (() => void) | undefined
  actions?: ReactNode
}) {
  return (
    <header className="panel-header">
      <div className="panel-title">
        {onBack !== undefined ? (
          <IconButton
            directional
            icon="arrow"
            label={t('action.back')}
            language={language}
            onClick={onBack}
          />
        ) : (
          <JusoorMark size={28} />
        )}
        <strong>{title}</strong>
      </div>
      <div className="panel-actions">{actions}</div>
    </header>
  )
}

export function ScreenBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <main className={`panel-body ${className}`.trim()}>{children}</main>
}

export function BottomAction({ children }: { children: ReactNode }) {
  return <footer className="panel-bottom-action">{children}</footer>
}

export function SectionHead({ title, meta, action }: { title: ReactNode; meta?: ReactNode | undefined; action?: ReactNode | undefined }) {
  return (
    <div className="section-mini-head">
      <strong>{title}</strong>
      {meta !== undefined && <span>{meta}</span>}
      {action}
    </div>
  )
}

// ===== عناصر مساندة =====

/**
 * نغمات هوية الموقع — من `SiteFavicon` المرجعي في ui.tsx:
 * `brand` عام · `paper` وثيقة/PDF · `code` مصدر تطويري · `question` يحتاج تحققًا.
 * اللون ليس الوسيلة الوحيدة: النغمة تصاحب دومًا بيانات نصية (الدور، النطاق، ‏PDF).
 */
export type FaviconTone = 'brand' | 'paper' | 'code' | 'question'

export function SiteFavicon({ domain, tone = 'brand' }: { domain: string; tone?: FaviconTone }) {
  const initial = domain.replace('www.', '').charAt(0).toUpperCase()
  return (
    <span aria-hidden="true" className={`site-favicon ${tone}`}>
      {initial}
    </span>
  )
}

export function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <span className="stat">
      <strong>{value}</strong>
      <small>{label}</small>
    </span>
  )
}

export function EmptyState({
  icon = 'workspace',
  title,
  detail,
  action,
  onAction,
}: {
  icon?: IconName
  title: string
  detail: string
  action?: string | undefined
  onAction?: (() => void) | undefined
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} size={24} />
      </span>
      <h4>{title}</h4>
      <p>{detail}</p>
      {action !== undefined && (
        <Button onClick={onAction} size="sm">
          {action}
        </Button>
      )}
    </div>
  )
}

export function SystemMessage({
  kind,
  title,
  detail,
  action,
  onAction,
}: {
  kind: 'toast' | 'alert' | 'banner' | 'error'
  title: string
  detail?: string | undefined
  action?: string | undefined
  onAction?: (() => void) | undefined
}) {
  const icon: IconName = kind === 'error' ? 'unavailable' : kind === 'banner' ? 'warning' : 'success'
  return (
    <div className={`system-message ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon name={icon} size={18} />
      <div>
        <strong>{title}</strong>
        {detail !== undefined && <span>{detail}</span>}
      </div>
      {action !== undefined && (
        <Button onClick={onAction} size="sm" variant="text">
          {action}
        </Button>
      )}
    </div>
  )
}

// ===== حوار التأكيد التدميري — نمط dialog المرجعي (§10.6 هوية) =====

export function ConfirmDialog({
  icon = 'trash',
  title,
  body,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  danger = true,
}: {
  icon?: IconName
  title: string
  body: string
  cancelLabel: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
  danger?: boolean
}) {
  return (
    <div className="dialog-overlay">
      <div aria-label={title} className="dialog-card" role="alertdialog">
        <div className={`dialog-icon ${danger ? 'danger' : ''}`.trim()}>
          <Icon name={icon} size={20} />
        </div>
        <h3>{title}</h3>
        <p>{body}</p>
        <div className="dialog-actions">
          <Button onClick={onCancel} variant="secondary">
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} variant={danger ? 'danger' : 'primary'}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

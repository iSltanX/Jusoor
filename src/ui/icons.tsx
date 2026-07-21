import type { ReactNode, SVGProps } from 'react'

/**
 * نظام أيقونات جُسور — منقول من المصدر التنفيذي المعتمد `src/icons.tsx` في حزمة
 * Jusoor Identity System v2 (مصادر الحقيقة §2 بند 3 في دستور الهوية).
 *
 * المسارات منقولة حرفيًا بلا إعادة رسم: شبكة 24px، سماكة 1.75px، نهايات مستديرة
 * (دستور الهوية §9). أيقونتا freeze/restore تمثلان دخول المسار إلى بوابة الحفظ
 * وخروجه منها — لا ندفة ثلج ولا سهم إعادة عام.
 *
 * تكييف وحيد عن المصدر: الانعكاس الاتجاهي كان `style={{ transform }}` مضمَّنًا،
 * وحارس القيم البصرية يمنع الأنماط المضمنة، فصار صنف `icon-mirrored` في CSS.
 * لا تغيير في أي مسار.
 */
export type IconName =
  | 'plus' | 'workspace' | 'page' | 'freeze' | 'restore' | 'checkpoint' | 'next'
  | 'note' | 'highlight' | 'reason' | 'search' | 'copy' | 'export' | 'import'
  | 'archive' | 'trash' | 'settings' | 'language' | 'sun' | 'moon' | 'success'
  | 'approximate' | 'unavailable' | 'more' | 'arrow' | 'close' | 'chevron'
  | 'filter' | 'lock' | 'external' | 'check' | 'clock' | 'pause' | 'circle'
  | 'menu' | 'warning' | 'info' | 'undo' | 'download' | 'eye' | 'login'
  | 'permission' | 'spinner' | 'file' | 'code' | 'research' | 'general'

const paths: Record<IconName, ReactNode> = {
  plus: <><path d="M12 5v14M5 12h14" /></>,
  workspace: <><rect x="3.5" y="5" width="17" height="14" rx="2.5" /><path d="M8 5V3.5h8V5M8 10h8" /></>,
  page: <><path d="M6 3.5h8l4 4V20.5H6z" /><path d="M14 3.5v4h4M9 12h6M9 15.5h5" /></>,
  freeze: <><path d="M3 17c3.2 0 3.2-10 7-10h1" /><rect x="10.5" y="5" width="5" height="5" rx="1.5" /><path d="M13 10v8M17 8v10" /></>,
  restore: <><path d="M3 17c3.2 0 3.2-10 7-10h1" /><rect x="10.5" y="5" width="5" height="5" rx="1.5" /><path d="M15.5 7.5H17c3.2 0 2.6 9.5 4 9.5M18 14l3 3-3 3" /></>,
  checkpoint: <><path d="M3 17c3.5 0 3-10 8-10h2c5 0 4.5 10 8 10" /><rect x="10" y="4.5" width="4" height="4" rx="1.2" /></>,
  next: <><path d="M4 17c4.5 0 4-10 9-10h7" /><path d="m17 4 3 3-3 3" /></>,
  note: <><path d="M5 4h14v12l-4 4H5z" /><path d="M15 20v-4h4M8 8h8M8 11.5h6" /></>,
  highlight: <><path d="m7 4 10 10-4 4L3 8zM5 10l-2 5 6 6 5-2" /></>,
  reason: <><circle cx="12" cy="12" r="8.5" /><path d="M9.7 9a2.5 2.5 0 0 1 4.8.8c0 2.2-2.5 2.2-2.5 4M12 17.5h.01" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 4 4" /></>,
  copy: <><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2" /></>,
  export: <><path d="M12 3v12M8 7l4-4 4 4" /><path d="M5 13v7h14v-7" /></>,
  import: <><path d="M12 15V3M8 11l4 4 4-4" /><path d="M5 13v7h14v-7" /></>,
  archive: <><rect x="4" y="7" width="16" height="13" rx="2" /><path d="M3 4h18v4H3zM9 12h6" /></>,
  trash: <><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19 14.5l1.5 1-2 3.5-1.8-.8a8 8 0 0 1-2.2 1.3L14.3 22h-4.1l-.3-2.2a8 8 0 0 1-2.4-1.3l-2 .7-2-3.5 1.7-1.2a8 8 0 0 1 0-2.8l-1.7-1.2 2-3.5 2 .7a8 8 0 0 1 2.4-1.3l.3-2.2h4.1l.3 2.2a8 8 0 0 1 2.2 1.3l1.8-.8 2 3.5-1.5 1a8 8 0 0 1 0 3.1Z" /></>,
  language: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>,
  sun: <><circle cx="12" cy="12" r="3.5" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></>,
  moon: <><path d="M19.5 15.5A8 8 0 0 1 8.5 4.5a8.3 8.3 0 1 0 11 11Z" /></>,
  success: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16.5 8" /></>,
  approximate: <><circle cx="12" cy="12" r="9" /><path d="M7 10c2-2 3 2 5 0s3 2 5 0M7 15c2-2 3 2 5 0s3 2 5 0" /></>,
  unavailable: <><circle cx="12" cy="12" r="9" /><path d="m8.5 8.5 7 7M15.5 8.5l-7 7" /></>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
  arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  chevron: <><path d="m9 6 6 6-6 6" /></>,
  filter: <><path d="M4 6h16M7 12h10M10 18h4" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v7H4V6h7" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  pause: <><circle cx="12" cy="12" r="9" /><path d="M10 9v6M14 9v6" /></>,
  circle: <><circle cx="12" cy="12" r="8" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  warning: <><path d="M12 3 2.8 20h18.4z" /><path d="M12 9v5M12 17.5h.01" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
  undo: <><path d="M9 8 4 12l5 4M5 12h8a6 6 0 0 1 6 6" /></>,
  download: <><path d="M12 3v12M8 11l4 4 4-4M5 20h14" /></>,
  eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
  login: <><path d="M14 5h5v14h-5M3 12h12M11 8l4 4-4 4" /></>,
  permission: <><path d="M12 3 5 6v5c0 4.7 2.8 8 7 10 4.2-2 7-5.3 7-10V6z" /><path d="m9 12 2 2 4-4" /></>,
  spinner: <><path d="M20 12a8 8 0 1 1-2.3-5.7" /></>,
  file: <><path d="M6 3h8l4 4v14H6zM14 3v5h4" /></>,
  code: <><path d="m9 8-4 4 4 4M15 8l4 4-4 4M13.5 5l-3 14" /></>,
  research: <><circle cx="10" cy="10" r="6" /><path d="m14.5 14.5 5 5M7 10h6M10 7v6" /></>,
  general: <><circle cx="12" cy="12" r="8.5" /><path d="M8 12h8M12 8v8" /></>,
}

export function Icon({
  name,
  size = 20,
  mirrored = false,
  className,
  ...props
}: { name: IconName; size?: number; mirrored?: boolean } & Omit<
  SVGProps<SVGSVGElement>,
  'style'
>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={[mirrored ? 'icon-mirrored' : undefined, className].filter(Boolean).join(' ') || undefined}
      {...props}
    >
      {paths[name]}
    </svg>
  )
}

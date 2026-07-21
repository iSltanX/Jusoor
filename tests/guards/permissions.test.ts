import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import config from '../../wxt.config'
import { PROJECT_ROOT, readProjectFile } from './project-files'

/**
 * حارس الصلاحيات.
 *
 * أي توسيع للصلاحيات يجب أن يفشل هنا أولًا ويستوجب قرارًا موثقًا في docs/decisions.
 * انظر docs/decisions/0004-permissions.md
 */

const APPROVED_PERMISSIONS = ['storage', 'sidePanel', 'activeTab']
const APPROVED_OPTIONAL_PERMISSIONS = ['tabs']

/**
 * `script-src` و`object-src` يمنعان الكود البعيد ولا يمنعان الاتصال الصادر.
 * `connect-src 'none'` هو ما يجعل منع الشبكة مفروضًا من المتصفح وقت التشغيل.
 */
const APPROVED_CSP = "script-src 'self'; object-src 'self'; connect-src 'none'"

/** هدفا البناء المعتمدان في هذه المرحلة. */
const BUILD_TARGETS = ['chrome-mv3', 'edge-mv3'] as const

/** صلاحيات ممنوعة صراحةً في مرحلة التأسيس. */
const FORBIDDEN = [
  'unlimitedStorage',
  'scripting',
  'downloads',
  'history',
  'bookmarks',
  'cookies',
  'webNavigation',
  'identity',
  'tabGroups',
  'declarativeNetRequest',
]

const declared = config.manifest

// الحارس يتطلب manifest ثابتًا لا دالة ولا وعدًا، حتى تُقرأ الصلاحيات دون تشغيل بناء.
if (typeof declared !== 'object' || declared === null || 'then' in declared) {
  throw new TypeError('يتوقع الحارس أن يكون manifest كائنًا ثابتًا في wxt.config.ts')
}

const manifest = declared

describe('حارس الصلاحيات — إعداد المشروع', () => {
  it('الصلاحيات الأساسية هي المعتمدة تمامًا', () => {
    expect([...(manifest.permissions ?? [])].sort()).toEqual(
      [...APPROVED_PERMISSIONS].sort(),
    )
  })

  it('tabs معلنة اختيارية فقط', () => {
    expect(manifest.optional_permissions).toEqual(APPROVED_OPTIONAL_PERMISSIONS)
    expect(manifest.permissions ?? []).not.toContain('tabs')
  })

  it('لا صلاحيات مواقع', () => {
    expect(manifest.host_permissions).toBeUndefined()
    expect(manifest.optional_host_permissions).toBeUndefined()
  })

  it('لا صلاحية من القائمة الممنوعة', () => {
    const declared = [
      ...(manifest.permissions ?? []),
      ...(manifest.optional_permissions ?? []),
    ]

    for (const permission of FORBIDDEN) {
      expect(declared, `الصلاحية ${permission} ممنوعة`).not.toContain(permission)
    }
  })

  it('سياسة أمان المحتوى تمنع الكود البعيد والاتصال الصادر', () => {
    expect(manifest.content_security_policy?.extension_pages).toBe(APPROVED_CSP)
  })
})

/**
 * الفحص الحقيقي هو على المخرجات؛ يعمل بعد `pnpm build` و`pnpm build:edge`
 * ويتخطى الهدف الذي لم يُبنَ بعد.
 *
 * الادعاء بأن منع الشبكة «بنيوي» لا يصح إلا إذا ظهر `connect-src 'none'`
 * في المخرجات الفعلية، فيُفحص هنا لكل هدف على حدة.
 */
interface BuiltManifest {
  manifest_version?: number
  permissions?: string[]
  optional_permissions?: string[]
  host_permissions?: string[]
  content_scripts?: unknown[]
  content_security_policy?: { extension_pages?: string }
}

describe.each(BUILD_TARGETS)('حارس الصلاحيات — مخرجات %s', (target) => {
  const relativePath = `.output/${target}/manifest.json`
  const built = existsSync(join(PROJECT_ROOT, relativePath))

  const read = (): BuiltManifest =>
    JSON.parse(readProjectFile(relativePath)) as BuiltManifest

  it.skipIf(!built)('MV3 وبالصلاحيات المعتمدة وحدها', () => {
    const output = read()

    expect(output.manifest_version).toBe(3)
    expect([...(output.permissions ?? [])].sort()).toEqual(
      [...APPROVED_PERMISSIONS].sort(),
    )
    expect(output.optional_permissions).toEqual(APPROVED_OPTIONAL_PERMISSIONS)
    expect(output.host_permissions).toBeUndefined()
  })

  it.skipIf(!built)("يحمل connect-src 'none' فعليًا", () => {
    const csp = read().content_security_policy?.extension_pages

    expect(csp, 'CSP غائب عن المخرجات').toBeDefined()
    expect(csp).toContain("connect-src 'none'")
    expect(csp).toBe(APPROVED_CSP)
  })

  it.skipIf(!built)('لا تُسجَّل content scripts', () => {
    expect(read().content_scripts).toBeUndefined()
  })
})

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { PROJECT_ROOT, readProjectFile } from './project-files'
import { collectFiles } from './project-files'

/**
 * حارس سلامة الأصول المعتمدة.
 *
 * identity/ **مجموعة الأصول المعتمدة المستهلكة من الحزمة، منسوخة بايت-ببايت دون تعديل**
 * — وليست نسخة من كامل ملف ZIP. استُبعد تطبيق Figma Make و`dist/` والملفات غير المستخدمة
 * (التفصيل في docs/identity-source.md).
 *
 * ما يثبته هذا الفحص:
 *   1. الملفات المنقولة مطابقة لنظيراتها داخل الحزمة.
 *   2. لم تُعدَّل بعد النقل.
 *   3. لم تُضف ملفات غير مسجَّلة داخل identity/.
 *
 * ما لا يثبته: أن identity/ تطابق كامل محتوى الحزمة — فهي لا تطابقه بالتصميم.
 *
 * البصمات محفوظة خارج identity/ في docs/identity-checksums.txt عمدًا،
 * حتى لا تحوي المنطقة المعتمدة أي ملف من إنتاجنا.
 */

interface Checksum {
  hash: string
  file: string
}

function readBaseline(): Checksum[] {
  return readProjectFile('docs/identity-checksums.txt')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => {
      const [hash, file] = line.split(/\s+/)
      if (hash === undefined || file === undefined) {
        throw new Error(`سطر بصمة غير صالح: ${line}`)
      }
      return { hash, file }
    })
}

function hashOf(relativePath: string): string {
  return createHash('sha256')
    .update(readFileSync(join(PROJECT_ROOT, relativePath)))
    .digest('hex')
}

describe('حارس سلامة identity/', () => {
  const baseline = readBaseline()

  it('البصمات المرجعية موجودة وغير فارغة', () => {
    expect(baseline.length).toBeGreaterThan(0)
  })

  it.each(baseline)('$file لم يُعدَّل منذ نقله من الحزمة', ({ hash, file }) => {
    expect(hashOf(file), `${file} تغيّر عن نسخته في حزمة الهوية`).toBe(hash)
  })

  it('لا ملف في identity/ خارج البصمات المرجعية', () => {
    const onDisk = collectFilesInIdentity()
    const known = new Set(baseline.map((entry) => entry.file))
    const unexpected = onDisk.filter((file) => !known.has(file))

    expect(unexpected, 'أُضيفت ملفات إلى identity/ دون تحديث البصمات').toEqual([])
  })

  it('لا ملفات من إنتاجنا داخل identity/', () => {
    const ours = collectFilesInIdentity().filter((file) =>
      /(?:^|\/)(?:UPSTREAM\.md|README\.md|LICENSE|.*\.checksums\.txt)$/i.test(file),
    )

    expect(ours, 'identity/ تحمل أصولًا من الحزمة وحدها').toEqual([])
  })
})

/**
 * يثبت أن كل ملف منقول مطابق لنظيره **داخل الحزمة نفسها**، لا لبصمة سجّلناها بأنفسنا.
 * بدون هذا الفحص تثبت البصمات «لم يتغير منذ النقل» فقط، لا «مطابق للمصدر».
 *
 * يعتمد على `unzip` المتاح على macOS و Linux، ويتخطى إن غاب ملف الحزمة.
 */
describe('مطابقة identity/ لمحتوى الحزمة', () => {
  const ZIP = 'Jusoor-Identity-System-v2.zip'
  const available =
    existsSync(join(PROJECT_ROOT, ZIP)) &&
    (() => {
      try {
        execFileSync('unzip', ['-v'], { stdio: 'ignore' })
        return true
      } catch {
        return false
      }
    })()

  /** `identity/brand/x` ← `public/brand/x` داخل الحزمة. */
  const zipEntryFor = (file: string): string => file.replace(/^identity\//, 'public/')

  it.skipIf(!available).each(readBaseline())(
    '$file مطابق لنظيره في الحزمة',
    ({ file }) => {
      const fromZip = execFileSync('unzip', ['-p', ZIP, zipEntryFor(file)], {
        cwd: PROJECT_ROOT,
        maxBuffer: 32 * 1024 * 1024,
      })

      expect(
        createHash('sha256').update(fromZip).digest('hex'),
        `${file} لا يطابق ${zipEntryFor(file)} داخل ${ZIP}`,
      ).toBe(hashOf(file))
    },
  )
})

/**
 * identity/ مستثناة من ماسح المشروع العام، فتُقرأ هنا صراحةً.
 *
 * المسح من جذر identity/ لا من مجلداتها الفرعية: ملف دخيل في الجذر نفسه
 * (مثل `.DS_Store` الذي ينشئه macOS) لن يُرى إن اقتصر المسح على brand/ و fonts/.
 */
function collectFilesInIdentity(): string[] {
  return collectFiles('identity', [''])
}

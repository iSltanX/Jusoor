import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

/** جذر المشروع، مشتق من موقع هذا الملف. */
export const PROJECT_ROOT = resolve(import.meta.dirname, '..', '..')

const SKIPPED_DIRECTORIES = new Set([
  'node_modules',
  '.wxt',
  '.output',
  '.git',
  'identity',
])

/** يجمع الملفات تحت مسار معين، بامتدادات محددة، بمسارات نسبية إلى جذر المشروع. */
export function collectFiles(
  relativeRoot: string,
  extensions: readonly string[],
): string[] {
  const absoluteRoot = join(PROJECT_ROOT, relativeRoot)
  const found: string[] = []

  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory)) {
      if (SKIPPED_DIRECTORIES.has(entry)) continue

      const absolute = join(directory, entry)

      if (statSync(absolute).isDirectory()) {
        walk(absolute)
      } else if (extensions.some((extension) => entry.endsWith(extension))) {
        found.push(relative(PROJECT_ROOT, absolute))
      }
    }
  }

  walk(absoluteRoot)
  return found.sort()
}

export function readProjectFile(relativePath: string): string {
  return readFileSync(join(PROJECT_ROOT, relativePath), 'utf8')
}

/** يوحّد الفواصل حتى تعمل مطابقة المسارات على كل المنصات. */
export function toPosix(path: string): string {
  return path.split(sep).join('/')
}

/** يزيل التعليقات حتى لا يُحاسب الشرح على ما يمنعه الحارس. */
export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

/** الأسطر المطابقة لنمط، مع أرقامها، لرسالة فشل مفهومة. */
export function matchingLines(source: string, pattern: RegExp): string[] {
  return source
    .split('\n')
    .map((line, index) => ({ line: line.trim(), number: index + 1 }))
    .filter(({ line }) => pattern.test(line))
    .map(({ line, number }) => `${String(number)}: ${line}`)
}

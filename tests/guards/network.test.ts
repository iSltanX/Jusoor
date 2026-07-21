import { describe, expect, it } from 'vitest'

import {
  collectFiles,
  matchingLines,
  readProjectFile,
  stripComments,
  toPosix,
} from './project-files'

/**
 * حارس منع الشبكة.
 *
 * جُسور محلي بالكامل: لا حساب ولا خادم ولا خدمة خارجية — دستور المنتج §11.
 * المنع مفروض بالبناء لا بالنية.
 */

const NETWORK_APIS = [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bEventSource\b/,
  /\bsendBeacon\b/,
  /\bnavigator\s*\.\s*sendBeacon\b/,
]

describe('حارس الشبكة', () => {
  const sources = collectFiles('src', ['.ts', '.tsx'])

  it('يفحص ملفات مصدر فعلية', () => {
    expect(sources.length).toBeGreaterThan(10)
  })

  it.each(sources)('%s لا يستدعي أي واجهة شبكة', (file) => {
    const code = stripComments(readProjectFile(file))

    for (const pattern of NETWORK_APIS) {
      expect(
        matchingLines(code, pattern),
        `${toPosix(file)} يستدعي واجهة شبكة (${pattern.source})`,
      ).toEqual([])
    }
  })
})

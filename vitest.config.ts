import { defineConfig } from 'vitest/config'

/**
 * مشروعان منفصلان بالبيئة، لا بيئة واحدة للجميع:
 *
 * - `node`: المجال والتخزين والمتصفح والحراس. الحراس يقرأون ملفات المشروع من
 *   القرص، والتخزين يستخدم fake-indexeddb، ولا شيء منها يحتاج DOM — تحميل jsdom
 *   لها إبطاء بلا مقابل وتغيير لبيئة التشغيل الحقيقية التي تُختبر فيها.
 * - `ui`: مكونات React وحدها، وهي الوحيدة التي تحتاج DOM فعليًا (لوحة المفاتيح،
 *   التركيز، ربط التسميات بالحقول) — فحصها بلا DOM كان سيجعل ادعاء الوصول بلا دليل.
 *
 * الامتدادان مختلفان (`.test.ts` مقابل `.test.tsx`) فلا تتداخل القائمتان.
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/**/*.test.ts'],
          root: import.meta.dirname,
        },
      },
      {
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['tests/ui/**/*.test.tsx'],
          root: import.meta.dirname,
        },
      },
    ],
  },
})

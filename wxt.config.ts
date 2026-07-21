import { resolve } from 'node:path'
import { defineConfig } from 'wxt'

/**
 * إعداد WXT لإضافة «جُسور».
 *
 * المتصفحات المستهدفة في هذه المرحلة: Google Chrome و Microsoft Edge (كلاهما Chromium / MV3).
 * Firefox مؤجل — انظر docs/decisions/0002-target-browsers.md
 */

/** أيقونات المتصفح المعتمدة، تُقرأ من حزمة الهوية دون تعديل. */
const IDENTITY_ICONS = [16, 32, 48, 128] as const

/**
 * تراخيص الخطوط المعاد توزيعها داخل الحزمة.
 *
 * Almarai و Cairo يُشحنان كملفات `.ttf` في المخرجات، ورخصة SIL Open Font License
 * 1.1 توجب إرفاق نص الترخيص مع أي إعادة توزيع. تُنسخ من `licenses/` لا من نسخة
 * ثانية داخل `public/`، فلا يوجد ملفان قد يتباعدان.
 */
const FONT_LICENSES = ['Almarai-OFL.txt', 'Cairo-OFL.txt'] as const

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],

  manifest: {
    name: 'جُسور — Jusoor',
    description:
      'احفظ سياق عملك في المتصفح واستعده. Save and restore your working context in the browser.',

    /*
     * أيقونة شريط الأدوات بلا popup: نقرها يفتح اللوحة الجانبية مباشرة عبر
     * openPanelOnActionClick في عامل الخدمة — تعديل مؤرخ على قرار 0003.
     * يجب التصريح بـ action وإلا لم تعمل أي نقرة على الأيقونة.
     */
    action: {
      default_title: 'جُسور — Jusoor',
    },

    // الصلاحيات المعتمدة في مرحلة التأسيس — لا تُوسَّع دون قرار موثق.
    // انظر docs/decisions/0004-permissions.md
    permissions: ['storage', 'sidePanel', 'activeTab'],

    // اختيارية: تُطلب بفعل صريح وحده، ورفضها لا يعطّل المنتج — قرار 0004.
    optional_permissions: ['tabs'],

    /*
     * `script-src` و`object-src` يمنعان الكود البعيد، لكنهما لا يمسّان الاتصال الصادر.
     * `connect-src 'none'` هو ما يمنع fetch و XHR و WebSocket و EventSource و sendBeacon
     * وقت التشغيل، فيصبح المنع مفروضًا من المتصفح لا من مراجعة الشيفرة وحدها.
     *
     * أثر معروف: WXT في وضع التطوير يضيف localhost إلى `script-src` فقط ولا يمسّ
     * `connect-src` (‎core/utils/manifest.mjs‎)، فلن يتصل HMR أثناء `pnpm dev`
     * وسيلزم إعادة تحميل الإضافة يدويًا. مقبول: صحة المنتج المشحون تسبق راحة التطوير.
     */
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; connect-src 'none'",
    },

    icons: Object.fromEntries(
      IDENTITY_ICONS.map((size) => [size, `icons/icon-${size}.png`]),
    ),
  },

  hooks: {
    /**
     * تُنسخ أيقونات المتصفح من identity/brand إلى مخرجات البناء دون المرور بمجلد public،
     * حتى تبقى identity/ مصدرًا للقراءة فقط ولا تُنسخ أصولها التسويقية غير المستخدمة.
     */
    'build:publicAssets': (_wxt, files) => {
      for (const size of IDENTITY_ICONS) {
        files.push({
          absoluteSrc: resolve(`identity/brand/icon-${size}.png`),
          relativeDest: `icons/icon-${size}.png`,
        })
      }

      // شرط إعادة التوزيع في OFL 1.1 — يفرضه tests/guards/font-licenses.test.ts
      for (const license of FONT_LICENSES) {
        files.push({
          absoluteSrc: resolve(`licenses/fonts/${license}`),
          relativeDest: `licenses/${license}`,
        })
      }
    },
  },

  vite: () => ({
    build: {
      // لا تضمين أصول كـ data URI؛ نريد ملفات صريحة يمكن تدقيقها في المخرجات.
      assetsInlineLimit: 0,

      /*
       * تعطيل ترقيع modulePreload.
       * الترقيع يحقن استدعاء fetch() في الحزمة لتحميل الوحدات مسبقًا، وهو استدعاء شبكة
       * فعلي في الكود المشحون وإن كان هدفه محليًا. Chrome و Edge يدعمان modulepreload
       * أصلًا، فلا حاجة إليه — ويبقى المخرَج خاليًا من أي واجهة شبكة.
       * يفحص هذا حارس tests/guards/external-resources.test.ts على المخرجات المبنية.
       */
      modulePreload: false,
    },
  }),
})
